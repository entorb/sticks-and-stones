// Single source of truth for all game numbers.

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
