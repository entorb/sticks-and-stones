import { BUILDINGS, SELL_REFUND } from "./balance.ts"
import { isHut, tileAt } from "./map.ts"
import { buildingAt, idlePeasants } from "./state.ts"
import { type BuildingType, type GameState, Terrain } from "./types.ts"

export type PlaceError = "locked" | "terrain" | "occupied" | "notNear" | "cost"

function hasNeighbor(s: GameState, x: number, y: number, terrain: Terrain): boolean {
  for (const dy of [-1, 0, 1])
    for (const dx of [-1, 0, 1]) if (tileAt(s.map, x + dx, y + dy) === terrain) return true
  return false
}

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
  if (isHut(s.map, x, y) || buildingAt(s, x, y)) return "occupied"
  if (spec.near !== null && !hasNeighbor(s, x, y, spec.near)) return "notNear"
  if (s.res.wood < spec.cost.wood || s.res.stone < spec.cost.stone) return "cost"
  return null
}

/** Build and pay; staffs the building from idle peasants if possible. */
export function placeBuilding(
  s: GameState,
  type: BuildingType,
  x: number,
  y: number,
): PlaceError | null {
  const err = placeError(s, type, x, y)
  if (err) return err
  const spec = BUILDINGS[type]
  s.res.wood -= spec.cost.wood
  s.res.stone -= spec.cost.stone
  const workers = idlePeasants(s) >= spec.workers ? spec.workers : 0
  s.buildings.push({ id: s.nextId, type, x, y, workers })
  s.nextId += 1
  return null
}

/** Demolish, refund SELL_REFUND of the cost, workers become idle. */
export function sellBuilding(s: GameState, id: number): boolean {
  const i = s.buildings.findIndex((x) => x.id === id)
  const b = s.buildings[i]
  if (!b) return false
  const { cost } = BUILDINGS[b.type]
  s.res.wood += Math.floor(cost.wood * SELL_REFUND)
  s.res.stone += Math.floor(cost.stone * SELL_REFUND)
  s.buildings.splice(i, 1)
  return true
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
