export const Terrain = {
  Grass: 0,
  Forest: 1,
  Rock: 2,
  Water: 3,
} as const
export type Terrain = (typeof Terrain)[keyof typeof Terrain]

export interface Point {
  x: number
  y: number
}

export interface GameMap {
  width: number
  height: number
  /** Row-major, index = y * width + x. */
  tiles: Terrain[]
  /** Top-left tile of the keep (MAP.keepSize square). */
  keep: Point
  /** Enemy spawn tiles on the map edge. */
  spawns: Point[]
}
