import { ENEMIES, ENEMY_AGGRO, PEASANT, REPUTATION } from "./balance.ts"
import {
  type Battle,
  dist,
  type Enemy,
  moveToward,
  newUnit,
  reach,
  separate,
  strike,
  type Unit,
} from "./battle.ts"
import {
  flyRocks,
  mayorAt,
  mayorFights,
  movePeasants,
  musterPeasants,
  throwRocks,
} from "./defenders.ts"
import { hutCenter } from "./map.ts"
import { lineWalkable, nextTile, waypoint } from "./pathing.ts"
import { nextStage } from "./progression.ts"
import { buildingAt } from "./state.ts"
import type { Building, GameState, Resources } from "./types.ts"
import { hitWall, isWall, walkGrids } from "./walls.ts"
import { spawnSchedule, waveSpawn } from "./waves.ts"

/** Start the defense phase of the current stage. */
export function startWave(s: GameState): Battle {
  let id = 1
  const grids = walkGrids(s)
  const peasants = musterPeasants(s, grids.peasantGrid, () => id++)
  return {
    tick: 0,
    ...grids,
    flawless: s.buildings.some((x) => isWall(x.type)),
    spawns: spawnSchedule(s.stage),
    enemies: [],
    peasants,
    mayor: mayorAt(hutCenter(s.map)),
    rocks: [],
    loot: { wood: 0, stone: 0 },
    fallen: 0,
    nextId: id,
    result: "running",
    events: [],
  }
}

function spawnEnemies(s: GameState, b: Battle): void {
  const origin = b.spawns[0] && b.spawns[0].tick <= b.tick ? waveSpawn(s) : undefined
  while (origin && b.spawns[0] && b.spawns[0].tick <= b.tick) {
    const kind = b.spawns[0].kind
    b.spawns.shift()
    b.enemies.push({ ...newUnit(b.nextId, origin, ENEMIES[kind].hp), kind })
    b.nextId += 1
  }
}

/** Prey within aggro range and a straight walk: the mayor first (that wins the battle), else the
 * weakest peasant (if it preys), ties by distance. */
function prey(b: Battle, e: Enemy): Unit | undefined {
  const spec = ENEMIES[e.kind]
  const ok = (u: Unit) =>
    dist(e, u) <= ENEMY_AGGRO && (reach(e, u) <= spec.range || lineWalkable(b.grid, e, u))
  if (ok(b.mayor)) return b.mayor
  let best: Unit | undefined
  for (const u of spec.preys ? b.peasants : []) {
    const better = !best || u.hp < best.hp || (u.hp === best.hp && dist(e, u) < dist(e, best))
    if (better && ok(u)) best = u
  }
  return best
}

/** The wall on the next tile of the enemy's path, if any. */
function wallAhead(s: GameState, b: Battle, e: Enemy): Building | undefined {
  const next = nextTile(b.grid, b.field, Math.round(e.x), Math.round(e.y))
  const w = next && buildingAt(s, next.x, next.y)
  return w && isWall(w.type) ? w : undefined
}

/** Attack prey in reach, chase prey nearby, break a wall in the way, else follow the path. */
function enemyAct(s: GameState, b: Battle, e: Enemy, tps: number): void {
  const spec = ENEMIES[e.kind]
  const p = prey(b, e)
  if (p && reach(e, p) <= spec.range) {
    strike(b, e, p, spec.damage, spec.cooldown)
    return
  }
  const wall = p ? undefined : wallAhead(s, b, e)
  // walls are tiles: reach counts from the tile edge
  if (wall && dist(e, wall) - 0.5 <= spec.range) {
    hitWall(s, b, e, wall)
    return
  }
  const hut = hutCenter(s.map)
  const path = () => (lineWalkable(b.grid, e, hut) ? hut : (waypoint(b.grid, b.field, e) ?? hut))
  moveToward(s.map, e, p ?? wall ?? path(), spec.speed, tps)
}

function removeDead(s: GameState, b: Battle): void {
  for (const e of b.enemies) {
    if (e.hp > 0) continue
    b.events.push({ type: "died", id: e.id })
    b.loot.wood += ENEMIES[e.kind].loot.wood
    b.loot.stone += ENEMIES[e.kind].loot.stone
  }
  b.enemies = b.enemies.filter((e) => e.hp > 0)
  for (const p of b.peasants) {
    if (p.hp > 0) continue
    b.events.push({ type: "died", id: p.id })
    s.peasants -= 1
    b.fallen += 1
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
  movePeasants(s, b, tps)
  separate(b)
  throwRocks(s, b, tps)
  mayorFights(b)
  flyRocks(b)
  removeDead(s, b)
  b.tick += 1
  if (b.mayor.hp <= 0) b.result = "lost"
  else if (b.spawns.length === 0 && b.enemies.length === 0) b.result = "won"
}

/** Kill loot, Reputation (more if flawless), recovered and new peasants, next stage after a won wave;
 * returns the total gain. */
export function winStage(
  s: GameState,
  b: Battle,
): Resources & { peasants: number; reputation: number } {
  const { loot } = b
  s.res.wood += loot.wood
  s.res.stone += loot.stone
  const reputation = b.flawless ? REPUTATION.flawless : REPUTATION.win
  s.reputation += reputation
  const peasants =
    1 + Math.floor(s.reputation / REPUTATION.arrivalsPer) + Math.ceil(b.fallen * PEASANT.recover)
  s.peasants += peasants
  const gain = nextStage(s)
  return { wood: gain.wood + loot.wood, stone: gain.stone + loot.stone, peasants, reputation }
}

/** Run a whole wave headless (tests, balancing). */
export function simulateWave(s: GameState, tps: number, maxTicks = 100_000): Battle {
  const b = startWave(s)
  while (b.result === "running" && b.tick < maxTicks) stepBattle(s, b, tps)
  return b
}
