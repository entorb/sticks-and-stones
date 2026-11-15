// Single source of truth for all game numbers.

import { type BuildingSpec, type BuildingType, Terrain } from "./types.ts"

/** Design viewport; the canvas resizes to the window (Scale.RESIZE). */
export const VIEW = { width: 960, height: 600 } as const

export const MAP = {
  width: 32,
  height: 24,
  /** Keep is a square of this many tiles in the map center. */
  keepSize: 2,
  /** Tiles around the keep kept free (grass). */
  keepClearRadius: 4,
  /** Terrain clusters: count, tiles per cluster, distance band from the keep center. */
  forest: { count: 4, size: 14, minDist: 6, maxDist: 13 },
  rock: { count: 3, size: 8, minDist: 6, maxDist: 12 },
  water: { count: 2, size: 10, minDist: 8, maxDist: 16 },
  spawnCount: 1,
} as const

/** Walk speed factor per terrain; 0 = blocks movement. */
export const WALK_SPEED: Record<Terrain, number> = {
  [Terrain.Grass]: 1,
  [Terrain.Forest]: 0.5,
  [Terrain.Rock]: 0,
  [Terrain.Water]: 0,
}

/** New village at checkpoint 1. */
export const START = { wood: 50, stone: 20, peasants: 4 } as const

export const BUILDINGS: Record<BuildingType, BuildingSpec> = {
  woodcutter: {
    cost: { wood: 10, stone: 0 },
    workers: 1,
    produces: { wood: 15, stone: 0 },
    near: Terrain.Forest,
    unlockStage: 1,
  },
  quarry: {
    cost: { wood: 15, stone: 0 },
    workers: 1,
    produces: { wood: 0, stone: 10 },
    near: Terrain.Rock,
    unlockStage: 1,
  },
  rockPile: {
    cost: { wood: 0, stone: 5 },
    workers: 0,
    produces: { wood: 0, stone: 0 },
    near: null,
    unlockStage: 1,
  },
}

/** Share of the building cost refunded on sale (rounded down). */
export const SELL_REFUND = 0.5
