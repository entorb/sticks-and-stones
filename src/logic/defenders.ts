import { MAYOR, PEASANT } from "./balance.ts"
import {
  type Battle,
  dist,
  type Enemy,
  MAYOR_ID,
  moveToward,
  newUnit,
  type Peasant,
  reach,
  strike,
} from "./battle.ts"
import { hutCenter } from "./map.ts"
import { flowField, lineWalkable, waypoint } from "./pathing.ts"
import { idlePeasants } from "./state.ts"
import type { GameState, Point } from "./types.ts"

/** Peasants leave their building or the hut, fetch rocks at the nearest pile and throw them. */
export function musterPeasants(s: GameState, nextId: () => number): Peasant[] {
  const piles = s.buildings.filter((b) => b.type === "rockPile")
  const fields = new Map(piles.map((p) => [p.id, flowField(s.map, [p])]))
  const muster = (at: Point, role: Peasant["role"], buildingId: number): Peasant => {
    // shortcut: nearest pile by straight distance, not walking cost; fine while maps are open
    const pile = [...piles].sort((a, b) => dist(at, a) - dist(at, b))[0]
    return {
      ...newUnit(nextId(), at, PEASANT.hp),
      role,
      home: pile ? { x: pile.x, y: pile.y } : { x: at.x, y: at.y },
      buildingId,
      field: pile ? (fields.get(pile.id) ?? []) : [],
      rock: false,
    }
  }
  const out: Peasant[] = []
  for (const b of s.buildings) {
    for (let i = 0; i < b.workers; i++) out.push(muster(b, "worker", b.id))
  }
  // without a pile idle peasants stay safe inside the hut
  const idle = piles.length > 0 ? idlePeasants(s) : 0
  for (let i = 0; i < idle; i++) out.push(muster(hutCenter(s.map), "idle", -1))
  return out
}

export const mayorAt = (center: Point) => newUnit(MAYOR_ID, center, MAYOR.hp)

/** Walk to the pile: straight when possible, else along the flow field. */
function walkHome(s: GameState, p: Peasant, tps: number): void {
  const target = lineWalkable(s.map, p, p.home) ? p.home : (waypoint(s.map, p.field, p) ?? p.home)
  moveToward(s.map, p, target, PEASANT.speed, tps)
}

/** Nearest live enemy within `range` of `from`. */
function nearestEnemy(b: Battle, from: Point, range: number): Enemy | undefined {
  let best: Enemy | undefined
  for (const e of b.enemies) {
    if (dist(from, e) <= range && (!best || dist(from, e) < dist(from, best))) best = e
  }
  return best
}

/** Without a rock: walk next to the pile (not onto it) and pick one up. With a rock: wait at the
 * pile, or close in on an enemy near the pile until it is in throw range. */
function peasantMoves(s: GameState, b: Battle, p: Peasant, tps: number): void {
  const atPile = dist(p, p.home) <= PEASANT.pickupReach
  if (!p.rock && atPile) p.rock = useStone(s, b)
  const foe = p.rock ? nearestEnemy(b, p.home, PEASANT.alertRange) : undefined
  if (foe && dist(p, foe) <= PEASANT.throwRange) return
  if (foe && lineWalkable(s.map, p, foe)) moveToward(s.map, p, foe, PEASANT.speed, tps)
  else if (!atPile) walkHome(s, p, tps)
}

const outOfStones = (s: GameState, b: Battle) => b.throwsLeft === 0 && s.res.stone === 0

/** Workers hit an enemy in tool range; without a rock to get, they charge enemies near their pile
 * (or building). True = the worker fought this tick. */
function toolFight(s: GameState, b: Battle, p: Peasant, tps: number): boolean {
  const close = nearestEnemy(b, p, PEASANT.toolRange)
  if (close) {
    strike(b, p, close, PEASANT.toolDamage, PEASANT.toolCooldown)
    return true
  }
  if (p.rock || (p.field.length > 0 && !outOfStones(s, b))) return false
  const foe = nearestEnemy(b, p.home, PEASANT.alertRange)
  if (!(foe && lineWalkable(s.map, p, foe))) return false
  moveToward(s.map, p, foe, PEASANT.speed, tps)
  return true
}

export function movePeasants(s: GameState, b: Battle, tps: number): void {
  for (const p of b.peasants) {
    if (p.role === "worker" && toolFight(s, b, p, tps)) continue
    if (p.field.length > 0) peasantMoves(s, b, p, tps)
  }
}

/** Damage already flying toward each enemy. */
function pendingDamage(b: Battle): Map<number, number> {
  const out = new Map<number, number>()
  for (const r of b.rocks) out.set(r.targetId, (out.get(r.targetId) ?? 0) + PEASANT.throwDamage)
  return out
}

/** Nearest enemy in range that incoming rocks won't already kill. */
function pickTarget(b: Battle, from: Point, pending: Map<number, number>): Enemy | undefined {
  let target: Enemy | undefined
  for (const e of b.enemies) {
    const doomed = e.hp <= (pending.get(e.id) ?? 0)
    if (doomed || dist(from, e) > PEASANT.throwRange) continue
    if (!target || dist(from, e) < dist(from, target)) target = e
  }
  return target
}

/** Take a stone from the stockpile when needed; false = out of stones. */
function useStone(s: GameState, b: Battle): boolean {
  if (b.throwsLeft === 0) {
    if (s.res.stone === 0) return false
    s.res.stone -= 1
    b.throwsLeft = PEASANT.throwsPerStone
  }
  b.throwsLeft -= 1
  return true
}

/** Peasants holding a rock throw it at the nearest enemy in range. */
export function throwRocks(b: Battle, tps: number): void {
  const pending = pendingDamage(b)
  for (const t of b.peasants) {
    if (!t.rock || t.cooldown > 0) continue
    const target = pickTarget(b, t, pending)
    if (!target) continue
    t.rock = false
    const total = Math.max(1, Math.ceil((dist(t, target) / PEASANT.rockSpeed) * tps))
    const rock = {
      id: b.nextId,
      from: { x: t.x, y: t.y },
      to: { x: target.x, y: target.y },
      targetId: target.id,
    }
    b.rocks.push({ ...rock, ticks: total, total })
    b.nextId += 1
    pending.set(target.id, (pending.get(target.id) ?? 0) + PEASANT.throwDamage)
    t.cooldown = PEASANT.throwCooldown
    b.events.push({ type: "throw", id: t.id })
  }
}

/** Rocks fly toward their target and deal damage on arrival. */
export function flyRocks(b: Battle): void {
  for (const r of b.rocks) {
    const e = b.enemies.find((x) => x.id === r.targetId)
    if (e) r.to = { x: e.x, y: e.y }
    r.ticks -= 1
    if (r.ticks > 0 || !e) continue
    e.hp -= PEASANT.throwDamage
    b.events.push({ type: "hit", id: e.id })
  }
  b.rocks = b.rocks.filter((r) => r.ticks > 0)
}

/** The mayor hits the nearest enemy in reach. */
export function mayorFights(b: Battle): void {
  let target: Enemy | undefined
  for (const e of b.enemies) {
    if (reach(b.mayor, e) <= MAYOR.range && (!target || dist(b.mayor, e) < dist(b.mayor, target)))
      target = e
  }
  if (target) strike(b, b.mayor, target, MAYOR.damage, MAYOR.cooldown)
}
