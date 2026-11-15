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

export type BuildingType = "woodcutter" | "quarry" | "rockPile"

export interface Resources {
  wood: number
  stone: number
}

export interface BuildingSpec {
  cost: Resources
  /** Workers needed to produce. 0 = not a work building. */
  workers: number
  /** Paid out once per stage when fully staffed. */
  produces: Resources
  /** Terrain that must be next to the building (8 neighbors), or null. */
  near: Terrain | null
  unlockStage: number
}

export interface Building {
  id: number
  type: BuildingType
  x: number
  y: number
  workers: number
}

export interface GameState {
  seed: number
  map: GameMap
  stage: number
  res: Resources
  /** All peasants; idle = peasants - assigned workers. */
  peasants: number
  buildings: Building[]
  nextId: number
}

export type EnemyKind = "raider"

export interface EnemySpec {
  hp: number
  /** Tiles per second on grass (scaled by WALK_SPEED). */
  speed: number
  damage: number
  /** Ticks between attacks. */
  cooldown: number
  /** Melee reach in tiles. */
  range: number
}

export interface WaveSpec {
  enemies: Partial<Record<EnemyKind, number>>
  /** Ticks between spawns. */
  interval: number
}
