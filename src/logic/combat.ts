import { ENEMIES, ENEMY_AGGRO, PLUNDER } from "./balance.ts"
import { type Battle, dist, type Enemy, moveToward, newUnit, strike, type Unit } from "./battle.ts"
import {
  flyRocks,
  mayorAt,
  mayorFights,
  musterPeasants,
  throwRocks,
  walkThrowers,
} from "./defenders.ts"
import { flowField, lineWalkable, waypoint } from "./pathing.ts"
import { nextStage } from "./progression.ts"
import type { GameState, Resources } from "./types.ts"
import { spawnSchedule } from "./waves.ts"

/** Start the defense phase of the current stage. */
export function startWave(s: GameState): Battle {
  let id = 1
  const peasants = musterPeasants(s, () => id++)
  return {
    tick: 0,
    field: flowField(s.map, s.map.hut),
    spawns: spawnSchedule(s.stage),
    enemies: [],
    peasants,
    mayor: mayorAt(s.map.hut),
    rocks: [],
    throwsLeft: 0,
    nextId: id,
    result: "running",
    events: [],
  }
}

function spawnEnemies(s: GameState, b: Battle): void {
  const origin = s.map.spawns[0]
  while (origin && b.spawns[0] && b.spawns[0].tick <= b.tick) {
    const kind = b.spawns[0].kind
    b.spawns.shift()
    b.enemies.push({ ...newUnit(b.nextId, origin, ENEMIES[kind].hp), kind })
    b.nextId += 1
  }
}

/** Nearest peasant or the mayor within aggro range and a straight walk. */
function prey(s: GameState, b: Battle, e: Enemy): Unit | undefined {
  let best: Unit | undefined
  for (const u of [b.mayor, ...b.peasants]) {
    const d = dist(e, u)
    if (d > ENEMY_AGGRO || (best && d >= dist(e, best))) continue
    if (d <= ENEMIES[e.kind].range || lineWalkable(s.map, e, u)) best = u
  }
  return best
}

/** Attack prey in reach, chase prey nearby, else follow the path to the hut. */
function enemyAct(s: GameState, b: Battle, e: Enemy, tps: number): void {
  const spec = ENEMIES[e.kind]
  const p = prey(s, b, e)
  if (p && dist(e, p) <= spec.range) {
    strike(b, e, p, spec.damage, spec.cooldown)
    return
  }
  const hut = s.map.hut
  const target = p ?? (lineWalkable(s.map, e, hut) ? hut : (waypoint(s.map, b.field, e) ?? hut))
  moveToward(s.map, e, target, spec.speed, tps)
}

function removeDead(s: GameState, b: Battle): void {
  for (const e of b.enemies) if (e.hp <= 0) b.events.push({ type: "died", id: e.id })
  b.enemies = b.enemies.filter((e) => e.hp > 0)
  for (const p of b.peasants) {
    if (p.hp > 0) continue
    b.events.push({ type: "died", id: p.id })
    s.peasants -= 1
    const home = s.buildings.find((x) => x.id === p.buildingId)
    if (p.role === "worker" && home) home.workers -= 1
  }
  b.peasants = b.peasants.filter((p) => p.hp > 0)
}

/** Advance the battle by one tick. */
export function stepBattle(s: GameState, b: Battle, tps: number): void {
  if (b.result !== "running") return
  b.events = []
  for (const u of [b.mayor, ...b.peasants, ...b.enemies]) {
    u.px = u.x
    u.py = u.y
    u.cooldown = Math.max(0, u.cooldown - 1)
  }
  spawnEnemies(s, b)
  for (const e of b.enemies) enemyAct(s, b, e, tps)
  walkThrowers(s, b, tps)
  throwRocks(s, b, tps)
  mayorFights(b)
  flyRocks(b)
  removeDead(s, b)
  b.tick += 1
  if (b.mayor.hp <= 0) b.result = "lost"
  else if (b.spawns.length === 0 && b.enemies.length === 0) b.result = "won"
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
