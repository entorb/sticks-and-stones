import { BUILDINGS, COST_GROWTH, UPGRADE } from "./balance.ts"
import { isHut, tileAt } from "./map.ts"
import { buildingAt, idlePeasants } from "./state.ts"
import { type BuildingType, type GameState, type Resources, Terrain } from "./types.ts"

export type PlaceError = "locked" | "terrain" | "occupied" | "notNear" | "cost"

function hasNeighbor(s: GameState, x: number, y: number, terrain: Terrain): boolean {
  for (const dy of [-1, 0, 1])
    for (const dx of [-1, 0, 1]) if (tileAt(s.map, x + dx, y + dy) === terrain) return true
  return false
}

/** Price of the next `type` building: the base cost grows with every one already built
 * (walls and towers keep a flat price). */
export function buildCost(s: GameState, type: BuildingType): Resources {
  const { cost, hp } = BUILDINGS[type]
  const f =
    hp === undefined ? 1 + COST_GROWTH * s.buildings.filter((b) => b.type === type).length : 1
  return { wood: Math.round(cost.wood * f), stone: Math.round(cost.stone * f) }
}

/** Building `type` at (x, y) upgrades the palisade there. */
const isUpgrade = (s: GameState, type: BuildingType, x: number, y: number) =>
  type === UPGRADE.to && buildingAt(s, x, y)?.type === UPGRADE.from

/** What building `type` at (x, y) costs (an upgrade costs less). */
const placeCost = (s: GameState, type: BuildingType, x: number, y: number): Resources =>
  isUpgrade(s, type, x, y) ? UPGRADE.cost : buildCost(s, type)

/** Why `type` can't be built at (x, y), or null if it can. */
export function placeError(
  s: GameState,
  type: BuildingType,
  x: number,
  y: number,
): PlaceError | null {
  const spec = BUILDINGS[type]
  if (s.stage < spec.unlockStage) return "locked"
  if (tileAt(s.map, x, y) !== Terrain.Grass) return "terrain"
  const spawn = s.map.spawns.some((p) => p.x === x && p.y === y)
  const taken = buildingAt(s, x, y) && !isUpgrade(s, type, x, y)
  if (isHut(s.map, x, y) || spawn || taken) return "occupied"
  if (spec.near !== null && !hasNeighbor(s, x, y, spec.near)) return "notNear"
  const cost = placeCost(s, type, x, y)
  if (s.res.wood < cost.wood || s.res.stone < cost.stone) return "cost"
  return null
}

/** Build (or upgrade) and pay; staffs the building from idle peasants if possible. */
export function placeBuilding(
  s: GameState,
  type: BuildingType,
  x: number,
  y: number,
): PlaceError | null {
  const err = placeError(s, type, x, y)
  if (err) return err
  const spec = BUILDINGS[type]
  const cost = placeCost(s, type, x, y)
  s.res.wood -= cost.wood
  s.res.stone -= cost.stone
  const old = buildingAt(s, x, y)
  if (old) {
    old.type = type
    old.hp = spec.hp
    return null
  }
  const workers = idlePeasants(s) >= spec.workers ? spec.workers : 0
  s.buildings.push({ id: s.nextId, type, x, y, workers, hp: spec.hp, rocks: spec.rocks })
  s.nextId += 1
  return null
}

/** Staffed → unstaffed, or unstaffed → staffed if enough peasants are idle. */
export function toggleWorkers(s: GameState, id: number): boolean {
  const b = s.buildings.find((x) => x.id === id)
  const need = b ? BUILDINGS[b.type].workers : 0
  if (!b || need === 0) return false
  if (b.workers > 0) b.workers = 0
  else if (idlePeasants(s) >= need) b.workers = need
  else return false
  return true
}
