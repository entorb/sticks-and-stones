import { MAYOR, PEASANT, ROCK_PILE_SLOTS } from "./balance.ts"
import {
  type Battle,
  dist,
  type Enemy,
  MAYOR_ID,
  moveToward,
  newUnit,
  type Peasant,
  strike,
} from "./battle.ts"
import { flowField, lineWalkable, waypoint } from "./pathing.ts"
import { idlePeasants } from "./state.ts"
import type { GameState, Point } from "./types.ts"

/** A thrower counts as arrived this close to its pile (tiles). */
const ARRIVED = 0.05

/** Workers stand at their buildings; idle peasants leave the hut for the free rock pile slots. */
export function musterPeasants(s: GameState, nextId: () => number): Peasant[] {
  const out: Peasant[] = []
  for (const b of s.buildings) {
    for (let i = 0; i < b.workers; i++) {
      out.push({
        ...newUnit(nextId(), b, PEASANT.hp),
        role: "worker",
        home: { x: b.x, y: b.y },
        buildingId: b.id,
        field: [],
      })
    }
  }
  const hut = s.map.hut
  const piles = s.buildings
    .filter((b) => b.type === "rockPile")
    .sort((a, b) => dist(a, hut) - dist(b, hut) || a.id - b.id)
  let idle = idlePeasants(s)
  for (const p of piles) {
    const field = flowField(s.map, p)
    for (let i = 0; i < ROCK_PILE_SLOTS && idle > 0; i++, idle--) {
      out.push({
        ...newUnit(nextId(), hut, PEASANT.hp),
        role: "thrower",
        home: { x: p.x, y: p.y },
        buildingId: p.id,
        field,
      })
    }
  }
  return out
}

export const mayorAt = (hut: Point) => newUnit(MAYOR_ID, hut, MAYOR.hp)

const arrived = (p: Peasant) => dist(p, p.home) < ARRIVED

/** Throwers walk to their pile (straight when possible, else along the flow field). */
export function walkThrowers(s: GameState, b: Battle, tps: number): void {
  for (const p of b.peasants) {
    if (p.role !== "thrower" || arrived(p)) continue
    const target = lineWalkable(s.map, p, p.home) ? p.home : (waypoint(s.map, p.field, p) ?? p.home)
    moveToward(s.map, p, target, PEASANT.speed, tps)
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

/** Throwers at their pile throw at the nearest enemy in range. */
export function throwRocks(s: GameState, b: Battle, tps: number): void {
  const pending = pendingDamage(b)
  for (const t of b.peasants) {
    if (t.role !== "thrower" || t.cooldown > 0 || !arrived(t)) continue
    const target = pickTarget(b, t, pending)
    if (!(target && useStone(s, b))) continue
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
    if (dist(b.mayor, e) <= MAYOR.range && (!target || dist(b.mayor, e) < dist(b.mayor, target)))
      target = e
  }
  if (target) strike(b, b.mayor, target, MAYOR.damage, MAYOR.cooldown)
}
