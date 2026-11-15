import { ENEMIES, PEASANT, PLUNDER, ROCK_PILE_SLOTS, WALK_SPEED } from "./balance.ts"
import { tileAt } from "./map.ts"
import { flowField, nextTile } from "./pathing.ts"
import { nextStage } from "./progression.ts"
import { idlePeasants, isKeep } from "./state.ts"
import type { EnemyKind, GameState, Point, Resources } from "./types.ts"
import { type Spawn, spawnSchedule } from "./waves.ts"

export interface Enemy {
  id: number
  kind: EnemyKind
  /** Position in tile units (tile centers are integers). */
  x: number
  y: number
  /** Position at the previous tick, for render interpolation. */
  px: number
  py: number
  target: Point
  hp: number
  cooldown: number
}

export interface Thrower {
  id: number
  x: number
  y: number
  hp: number
  cooldown: number
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

/** Things that happened this tick, for rendering. */
export type BattleEvent =
  | { type: "throw"; throwerId: number }
  | { type: "hit"; id: number }
  | { type: "enemyDied"; id: number }
  | { type: "peasantDied"; id: number }

export interface Battle {
  tick: number
  field: number[]
  spawns: Spawn[]
  enemies: Enemy[]
  throwers: Thrower[]
  rocks: Rock[]
  /** Throws left before the next stone is taken from the stockpile. */
  throwsLeft: number
  nextId: number
  result: "running" | "won" | "lost"
  events: BattleEvent[]
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Idle peasants take the free slots of the rock piles nearest to the keep. */
function manPiles(s: GameState): Thrower[] {
  const k = s.map.keep
  const piles = s.buildings
    .filter((b) => b.type === "rockPile")
    .sort((a, b) => dist(a, k) - dist(b, k) || a.id - b.id)
  const out: Thrower[] = []
  let idle = idlePeasants(s)
  for (const p of piles) {
    for (let i = 0; i < ROCK_PILE_SLOTS && idle > 0; i++, idle--) {
      out.push({ id: out.length + 1, x: p.x, y: p.y, hp: PEASANT.hp, cooldown: 0 })
    }
  }
  return out
}

/** Start the defense phase of the current stage. */
export function startWave(s: GameState): Battle {
  return {
    tick: 0,
    field: flowField(s.map),
    spawns: spawnSchedule(s.stage),
    enemies: [],
    throwers: manPiles(s),
    rocks: [],
    throwsLeft: 0,
    nextId: 1,
    result: "running",
    events: [],
  }
}

function spawnEnemies(s: GameState, b: Battle): void {
  const origin = s.map.spawns[0]
  while (origin && b.spawns[0] && b.spawns[0].tick <= b.tick) {
    const { kind } = b.spawns.shift() as Spawn
    const { x, y } = origin
    b.enemies.push({
      id: b.nextId,
      kind,
      x,
      y,
      px: x,
      py: y,
      target: { x, y },
      hp: ENEMIES[kind].hp,
      cooldown: 0,
    })
    b.nextId += 1
  }
}

/** Melee the nearest thrower in reach; returns true if the enemy fought instead of walking. */
function enemyAttack(b: Battle, e: Enemy): boolean {
  const spec = ENEMIES[e.kind]
  const victim = b.throwers.find((t) => dist(t, e) <= spec.range)
  if (!victim) return false
  if (e.cooldown === 0) {
    victim.hp -= spec.damage
    e.cooldown = spec.cooldown
  }
  return true
}

function enemyWalk(s: GameState, b: Battle, e: Enemy, tps: number): void {
  if (dist(e, e.target) < 1e-6) {
    const next = nextTile(s.map, b.field, Math.round(e.x), Math.round(e.y))
    if (!next) return
    e.target = next
  }
  const terrain = tileAt(s.map, Math.round(e.x), Math.round(e.y))
  const step = (ENEMIES[e.kind].speed * (terrain === undefined ? 1 : WALK_SPEED[terrain])) / tps
  const d = dist(e, e.target)
  const f = Math.min(1, step / d)
  e.x += (e.target.x - e.x) * f
  e.y += (e.target.y - e.y) * f
}

function moveEnemies(s: GameState, b: Battle, tps: number): void {
  for (const e of b.enemies) {
    e.px = e.x
    e.py = e.y
    e.cooldown = Math.max(0, e.cooldown - 1)
    if (!enemyAttack(b, e)) enemyWalk(s, b, e, tps)
    if (isKeep(s.map, Math.round(e.x), Math.round(e.y))) b.result = "lost"
  }
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

/** Damage already flying toward each enemy. */
function pendingDamage(b: Battle): Map<number, number> {
  const out = new Map<number, number>()
  for (const r of b.rocks) out.set(r.targetId, (out.get(r.targetId) ?? 0) + PEASANT.throwDamage)
  return out
}

/** Nearest enemy in range that incoming rocks won't already kill. */
function pickTarget(b: Battle, t: Thrower, pending: Map<number, number>): Enemy | undefined {
  let target: Enemy | undefined
  for (const e of b.enemies) {
    const doomed = e.hp <= (pending.get(e.id) ?? 0)
    if (doomed || dist(t, e) > PEASANT.throwRange) continue
    if (!target || dist(t, e) < dist(t, target)) target = e
  }
  return target
}

function throwRocks(s: GameState, b: Battle, tps: number): void {
  const pending = pendingDamage(b)
  for (const t of b.throwers) {
    t.cooldown = Math.max(0, t.cooldown - 1)
    if (t.cooldown > 0) continue
    const target = pickTarget(b, t, pending)
    if (!(target && useStone(s, b))) continue
    const total = Math.max(1, Math.ceil((dist(t, target) / PEASANT.rockSpeed) * tps))
    b.rocks.push({
      id: b.nextId,
      from: { x: t.x, y: t.y },
      to: { x: target.x, y: target.y },
      targetId: target.id,
      ticks: total,
      total,
    })
    b.nextId += 1
    pending.set(target.id, (pending.get(target.id) ?? 0) + PEASANT.throwDamage)
    t.cooldown = PEASANT.throwCooldown
    b.events.push({ type: "throw", throwerId: t.id })
  }
}

/** Rocks fly toward their target and deal damage on arrival. */
function flyRocks(b: Battle): void {
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

function removeDead(s: GameState, b: Battle): void {
  for (const e of b.enemies) if (e.hp <= 0) b.events.push({ type: "enemyDied", id: e.id })
  b.enemies = b.enemies.filter((e) => e.hp > 0)
  for (const t of b.throwers) {
    if (t.hp > 0) continue
    b.events.push({ type: "peasantDied", id: t.id })
    s.peasants -= 1
  }
  b.throwers = b.throwers.filter((t) => t.hp > 0)
}

/** Advance the battle by one tick. */
export function stepBattle(s: GameState, b: Battle, tps: number): void {
  if (b.result !== "running") return
  b.events = []
  spawnEnemies(s, b)
  moveEnemies(s, b, tps)
  if (b.result !== "running") return
  flyRocks(b)
  throwRocks(s, b, tps)
  removeDead(s, b)
  b.tick += 1
  if (b.spawns.length === 0 && b.enemies.length === 0) b.result = "won"
}

/** Plunder + next stage after a won wave; returns the total gain. */
export function winStage(s: GameState): Resources {
  s.res.wood += PLUNDER.wood
  s.res.stone += PLUNDER.stone
  const gain = nextStage(s)
  return { wood: gain.wood + PLUNDER.wood, stone: gain.stone + PLUNDER.stone }
}

/** Run a whole wave headless (tests, balancing). */
export function simulateWave(s: GameState, tps: number, maxTicks = 100_000): Battle {
  const b = startWave(s)
  while (b.result === "running" && b.tick < maxTicks) stepBattle(s, b, tps)
  return b
}
