// Single source of truth for all game numbers.

import { Terrain } from "./types.ts"

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
