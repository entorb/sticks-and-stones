import { BUILDINGS, ENEMIES, FIRE_DAMAGE, REPAIR_HP, WALL_PATH_COST } from "./balance.ts"
import type { Battle, Enemy } from "./battle.ts"
import { hutTiles } from "./map.ts"
import { flowField, type Grid } from "./pathing.ts"
import type { Building, BuildingType, GameState } from "./types.ts"

export const isWall = (type: BuildingType): boolean => BUILDINGS[type].hp !== undefined

/** Wooden walls (paid in wood) burn and are repaired with wood; the rest with stone. */
export const material = (type: BuildingType): "wood" | "stone" =>
  BUILDINGS[type].cost.wood > 0 ? "wood" : "stone"

/** The map as `side` walks it: enemies weigh walls by HP (break through or go around), peasants
 * can't pass palisades. */
export function wallGrid(s: GameState, side: "enemy" | "peasant"): Grid {
  const costs = new Map<number, number>()
  for (const b of s.buildings) {
    if (b.hp === undefined) continue
    const i = b.y * s.map.width + b.x
    if (side === "enemy") costs.set(i, b.hp * WALL_PATH_COST)
    else if (!BUILDINGS[b.type].peasantsPass) costs.set(i, Number.POSITIVE_INFINITY)
  }
  return { ...s.map, costs }
}

/** Grids and the enemy flow field for the current walls (battle start, after a wall breaks). */
export function walkGrids(s: GameState): Pick<Battle, "grid" | "peasantGrid" | "field"> {
  const grid = wallGrid(s, "enemy")
  return { grid, peasantGrid: wallGrid(s, "peasant"), field: flowField(grid, hutTiles(s.map)) }
}

/** Enemy hits a wall; a broken wall is removed and paths are recomputed. */
export function hitWall(s: GameState, b: Battle, e: Enemy, w: Building): void {
  if (e.cooldown > 0 || w.hp === undefined) return
  const spec = ENEMIES[e.kind]
  const burn = spec.fire && material(w.type) === "wood"
  w.hp -= spec.wallDamage * (burn ? FIRE_DAMAGE : 1)
  e.cooldown = spec.cooldown
  b.flawless = false
  b.events.push({ type: "wall", id: w.id })
  if (w.hp > 0) return
  s.buildings = s.buildings.filter((x) => x !== w)
  Object.assign(b, walkGrids(s))
}

/** Repair a damaged wall as far as the stockpile allows; false = nothing repaired. */
export function repairWall(s: GameState, id: number): boolean {
  const w = s.buildings.find((x) => x.id === id)
  const max = w && BUILDINGS[w.type].hp
  if (!w || w.hp === undefined || max === undefined || w.hp >= max) return false
  const mat = material(w.type)
  const units = Math.min(Math.ceil((max - w.hp) / REPAIR_HP), s.res[mat])
  if (units === 0) return false
  s.res[mat] -= units
  w.hp = Math.min(max, w.hp + units * REPAIR_HP)
  return true
}
