import { MAP, START } from "./balance.ts"
import { generateMap } from "./map.ts"
import type { Building, GameMap, GameState } from "./types.ts"

/** New village at stage 1 with the start package. */
export function newGame(seed: number, map: GameMap = generateMap(seed)): GameState {
  return {
    seed,
    map,
    stage: 1,
    res: { wood: START.wood, stone: START.stone },
    peasants: START.peasants,
    buildings: [],
    nextId: 1,
  }
}

export const idlePeasants = (s: GameState): number =>
  s.peasants - s.buildings.reduce((n, b) => n + b.workers, 0)

export const buildingAt = (s: GameState, x: number, y: number): Building | undefined =>
  s.buildings.find((b) => b.x === x && b.y === y)

export const isKeep = (map: GameMap, x: number, y: number): boolean =>
  x >= map.keep.x &&
  x < map.keep.x + MAP.keepSize &&
  y >= map.keep.y &&
  y < map.keep.y + MAP.keepSize
