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
  /** Top-left tile of the mayor's hut (MAP.hutSize², map center). */
  hut: Point
  /** Enemy spawn tiles on the map edge. */
  spawns: Point[]
}

export type BuildingType =
  | "woodcutter"
  | "quarry"
  | "rockPile"
  | "palisade"
  | "gate"
  | "stoneWall"
  | "tower"

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
  /** Walls and towers: hit points; they block enemies and keep a flat price. */
  hp?: number
  /** Peasants may walk through or stand on it (walls only). */
  peasantsPass?: boolean
  /** Extra throw range for peasants standing on it (tiles). */
  rangeBonus?: number
  /** Rock piles and towers: rocks stocked, refilled each build phase. */
  rocks?: number
}

export interface Building {
  id: number
  type: BuildingType
  x: number
  y: number
  workers: number
  /** Walls and towers only. */
  hp?: number
  /** Rock piles and towers: rocks left. */
  rocks?: number
}

export interface GameState {
  seed: number
  map: GameMap
  stage: number
  res: Resources
  /** All peasants; idle = peasants - assigned workers. */
  peasants: number
  /** Village Reputation: more peasants arrive. */
  reputation: number
  buildings: Building[]
  nextId: number
}

export type EnemyKind = "raider" | "torchbearer" | "armored" | "ram"

export interface EnemySpec {
  hp: number
  /** Tiles per second on grass (scaled by WALK_SPEED). */
  speed: number
  damage: number
  /** Ticks between attacks. */
  cooldown: number
  /** Melee reach in tiles. */
  range: number
  /** Damage per hit to walls. */
  wallDamage: number
  /** Fire: wooden walls take FIRE_DAMAGE times the wall damage. */
  fire: boolean
  /** Attacks peasants on its way; false = only walls and the mayor. */
  preys: boolean
  /** Plunder per kill, paid after a won wave. */
  loot: Resources
}

/** The mayor: permanent across villages (saved). */
export interface Profile {
  renown: number
  /** Highest checkpoint stage reached; new villages start here. */
  checkpoint: number
}

export interface WaveSpec {
  enemies: Partial<Record<EnemyKind, number>>
  /** Ticks between spawns. */
  interval: number
}
