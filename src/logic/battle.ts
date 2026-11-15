import { MAYOR } from "./balance.ts"
import { type Grid, walkSpeed } from "./pathing.ts"
import type { EnemyKind, GameMap, Point, Resources } from "./types.ts"
import type { Spawn } from "./waves.ts"

/** A moving unit; positions in tile units (tile centers are integers). */
export interface Unit {
  /** Unique within a battle (mayor = 0). */
  id: number
  x: number
  y: number
  /** Position at the previous tick, for render interpolation. */
  px: number
  py: number
  hp: number
  cooldown: number
}

export interface Enemy extends Unit {
  kind: EnemyKind
}

export interface Peasant extends Unit {
  /** Worker: left its building `buildingId` to defend. Idle: came out of the hut. */
  role: "worker" | "idle"
  /** The rock pile it fetches rocks from (its start point if there is no pile). */
  home: Point
  buildingId: number
  /** Rock pile or tower it takes rocks from; -1 = none. */
  pileId: number
  /** Picks up rocks this close to `home` (beside a pile, on a tower). */
  homeReach: number
  /** Flow field toward `home`; empty = no pile, the peasant stays put. */
  field: number[]
  /** Carries a rock, ready to throw. */
  rock: boolean
}

/** A thrown rock; it hits (applies damage) when `ticks` reaches 0. */
export interface Rock {
  id: number
  from: Point
  /** Where the target is now (follows it while alive). */
  to: Point
  targetId: number
  ticks: number
  total: number
}

/** Things that happened this tick, for rendering. Ids are unit ids, building ids for "wall". */
export type BattleEvent =
  | { type: "wall"; id: number }
  | { type: "throw"; id: number }
  /** Melee swing by unit `id`. */
  | { type: "strike"; id: number }
  | { type: "hit"; id: number }
  | { type: "died"; id: number }
  | { type: "empty"; id: number }

export interface Battle {
  tick: number
  /** Flow field toward the hut over `grid`. */
  field: number[]
  /** The map with walls as enemies and as peasants walk it. */
  grid: Grid
  peasantGrid: Grid
  /** Walls stood at the start and none was hit yet. */
  flawless: boolean
  spawns: Spawn[]
  enemies: Enemy[]
  peasants: Peasant[]
  mayor: Unit
  rocks: Rock[]
  /** Plunder from kills so far, paid on a win. */
  loot: Resources
  nextId: number
  result: "running" | "won" | "lost"
  events: BattleEvent[]
}

export const MAYOR_ID = 0

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Melee distance between units: the mayor is reached at the hut wall, not its center. */
export const reach = (a: Unit, b: Unit) =>
  dist(a, b) - (a.id === MAYOR_ID || b.id === MAYOR_ID ? MAYOR.radius : 0)

export const newUnit = (id: number, p: Point, hp: number): Unit => ({
  id,
  x: p.x,
  y: p.y,
  px: p.x,
  py: p.y,
  hp,
  cooldown: 0,
})

/** Step `u` toward `target` at `speed` tiles/s, slowed by the terrain it stands on. */
export function moveToward(map: GameMap, u: Unit, target: Point, speed: number, tps: number): void {
  const d = dist(u, target)
  if (d < 1e-6) return
  const terrain = walkSpeed(map, Math.round(u.x), Math.round(u.y)) || 1
  const f = Math.min(1, (speed * terrain) / tps / d)
  u.x += (target.x - u.x) * f
  u.y += (target.y - u.y) * f
}

/** Melee: hit `victim` if off cooldown. */
export function strike(
  b: Battle,
  attacker: Unit,
  victim: Unit,
  damage: number,
  cooldown: number,
): void {
  if (attacker.cooldown > 0) return
  victim.hp -= damage
  attacker.cooldown = cooldown
  b.events.push({ type: "strike", id: attacker.id }, { type: "hit", id: victim.id })
}
