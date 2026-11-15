import { BUILDINGS, MAYOR, PEASANT, TOWER_HOLDS } from "./balance.ts"
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
  weakestEnemy,
} from "./battle.ts"
import { hutCenter } from "./map.ts"
import { flowField, type Grid, lineWalkable, waypoint } from "./pathing.ts"
import { buildingAt, idlePeasants } from "./state.ts"
import type { GameState, Point } from "./types.ts"

/** Peasants leave their building or the hut and fetch rocks at the nearest rock pile or tower
 * with room (TOWER_HOLDS), then throw them. */
export function musterPeasants(s: GameState, grid: Grid, nextId: () => number): Peasant[] {
  const piles = s.buildings.filter((b) => b.type === "rockPile" || b.type === "tower")
  const fields = new Map(piles.map((p) => [p.id, flowField(grid, [p])]))
  const manned = new Map<number, number>()
  const muster = (at: Point, role: Peasant["role"], buildingId: number): Peasant => {
    // shortcut: nearest pile by straight distance, not walking cost; fine while maps are open
    const pile = [...piles]
      .sort((a, b) => dist(at, a) - dist(at, b))
      .find((p) => p.type !== "tower" || (manned.get(p.id) ?? 0) < TOWER_HOLDS)
    if (pile) manned.set(pile.id, (manned.get(pile.id) ?? 0) + 1)
    const field = pile ? (fields.get(pile.id) ?? []) : []
    // walled in (no path to the pile): stay put
    const reachable =
      (field[Math.round(at.y) * s.map.width + Math.round(at.x)] ?? 0) < Number.POSITIVE_INFINITY
    return {
      ...newUnit(nextId(), at, PEASANT.hp),
      role,
      home: pile ? { x: pile.x, y: pile.y } : { x: at.x, y: at.y },
      homeReach: pile?.type === "tower" ? PEASANT.towerReach : PEASANT.pickupReach,
      buildingId,
      pileId: pile?.id ?? -1,
      field: reachable ? field : [],
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
function walkHome(b: Battle, p: Peasant, tps: number): void {
  const g = b.peasantGrid
  const target = lineWalkable(g, p, p.home) ? p.home : (waypoint(g, p.field, p) ?? p.home)
  moveToward(g, p, target, PEASANT.speed / tps)
}

/** Throw range, plus the bonus of a stone wall or tower the peasant stands on. */
function throwRange(s: GameState, p: Point): number {
  const under = buildingAt(s, Math.round(p.x), Math.round(p.y))
  return PEASANT.throwRange + ((under && BUILDINGS[under.type].rangeBonus) ?? 0)
}

/** Nearest live enemy within `range` of `from`. */
function nearestEnemy(b: Battle, from: Point, range: number): Enemy | undefined {
  let best: Enemy | undefined
  for (const e of b.enemies) {
    if (dist(from, e) <= range && (!best || dist(from, e) < dist(from, best))) best = e
  }
  return best
}

/** Without a rock: walk next to the pile (not onto it) and pick one up. With a rock: wait where it is
 * (no walking back), or close in on an enemy near the pile until it is in throw range. */
function peasantMoves(s: GameState, b: Battle, p: Peasant, tps: number): void {
  const atPile = dist(p, p.home) <= p.homeReach
  if (!p.rock && atPile) p.rock = takeRock(s, b, p) || switchPile(s, b, p)
  const foe = p.rock ? nearestEnemy(b, p.home, PEASANT.alertRange) : undefined
  if (foe && dist(p, foe) <= throwRange(s, p)) return
  if (foe && lineWalkable(b.peasantGrid, p, foe)) moveToward(s.map, p, foe, PEASANT.speed / tps)
  else if (!(atPile || p.rock)) walkHome(b, p, tps)
}

const pileOf = (s: GameState, p: Peasant) => s.buildings.find((x) => x.id === p.pileId)

/** At an empty pile: head for the nearest reachable pile or tower with rocks and room; false = no
 * rock this tick. */
function switchPile(s: GameState, b: Battle, p: Peasant): false {
  const manned = (id: number) => b.peasants.filter((x) => x.pileId === id).length
  const piles = s.buildings
    .filter((x) => x.rocks && (x.type !== "tower" || manned(x.id) < TOWER_HOLDS))
    .sort((x, y) => dist(p, x) - dist(p, y))
  for (const pile of piles) {
    const field = flowField(b.peasantGrid, [pile])
    if ((field[Math.round(p.y) * s.map.width + Math.round(p.x)] ?? 0) < Number.POSITIVE_INFINITY) {
      Object.assign(p, {
        home: { x: pile.x, y: pile.y },
        homeReach: pile.type === "tower" ? PEASANT.towerReach : PEASANT.pickupReach,
        pileId: pile.id,
        field,
      })
      return false
    }
  }
  return false
}

/** Workers hit an enemy in tool range; without a rock to get, they charge enemies near their pile
 * (or building). True = the worker fought this tick. */
function toolFight(s: GameState, b: Battle, p: Peasant, tps: number): boolean {
  const close = weakestEnemy(b, p, PEASANT.toolRange)
  if (close) {
    strike(b, p, close, { damage: PEASANT.toolDamage, cooldown: PEASANT.toolCooldown })
    return true
  }
  if (p.rock || (p.field.length > 0 && (pileOf(s, p)?.rocks ?? 0) > 0)) return false
  const foe = nearestEnemy(b, p.home, PEASANT.alertRange)
  if (!(foe && lineWalkable(b.peasantGrid, p, foe))) return false
  moveToward(s.map, p, foe, PEASANT.speed / tps)
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

/** Enemy in range that incoming rocks won't already kill: one this rock finishes first, else the
 * one closest to the mayor (the biggest threat). */
function pickTarget(
  b: Battle,
  from: Point,
  range: number,
  pending: Map<number, number>,
): Enemy | undefined {
  const left = (e: Enemy) => e.hp - (pending.get(e.id) ?? 0)
  const score = (e: Enemy) => dist(b.mayor, e) - (left(e) <= PEASANT.throwDamage ? 1000 : 0)
  let target: Enemy | undefined
  for (const e of b.enemies) {
    if (left(e) > 0 && dist(from, e) <= range && (!target || score(e) < score(target))) target = e
  }
  return target
}

/** Take a rock from the peasant's pile; false = the pile is empty. */
function takeRock(s: GameState, b: Battle, p: Peasant): boolean {
  const pile = pileOf(s, p)
  if (!pile?.rocks) return false
  pile.rocks -= 1
  if (pile.rocks === 0) b.events.push({ type: "empty", id: pile.id })
  return true
}

/** Peasants holding a rock throw it at the nearest enemy in range. */
export function throwRocks(s: GameState, b: Battle, tps: number): void {
  const pending = pendingDamage(b)
  for (const t of b.peasants) {
    if (!t.rock || t.cooldown > 0) continue
    const target = pickTarget(b, t, throwRange(s, t), pending)
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

/** The mayor hits the weakest enemy in reach. */
export function mayorFights(b: Battle): void {
  const target = weakestEnemy(b, b.mayor, MAYOR.range, reach)
  if (target) strike(b, b.mayor, target, { damage: MAYOR.damage, cooldown: MAYOR.cooldown })
}
