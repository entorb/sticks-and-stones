import { CHECKPOINTS } from "./balance.ts"
import { generateMap } from "./map.ts"
import type { Building, GameMap, GameState } from "./types.ts"

/** New village at a checkpoint stage (else stage 1) with its start package; Reputation 0. */
export function newGame(seed: number, map: GameMap = generateMap(seed), checkpoint = 1): GameState {
  const start = CHECKPOINTS.find((c) => c.stage === checkpoint) ?? CHECKPOINTS[0]
  return {
    seed,
    map,
    stage: start.stage,
    res: { wood: start.wood, stone: start.stone },
    peasants: start.peasants,
    reputation: 0,
    buildings: [],
    nextId: 1,
  }
}

export const idlePeasants = (s: GameState): number =>
  s.peasants - s.buildings.reduce((n, b) => n + b.workers, 0)

export const buildingAt = (s: GameState, x: number, y: number): Building | undefined =>
  s.buildings.find((b) => b.x === x && b.y === y)
