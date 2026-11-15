// Single source of truth for all game numbers.

import {
  type BuildingSpec,
  type BuildingType,
  type EnemyKind,
  type EnemySpec,
  Terrain,
  type WaveSpec,
} from "./types.ts"

/** Design viewport; the canvas resizes to the window (Scale.RESIZE). */
export const VIEW = { width: 960, height: 600 } as const

export const MAP = {
  width: 32,
  height: 24,
  /** The mayor's hut is a square of this many tiles in the map center. */
  hutSize: 2,
  /** Tiles around the hut kept free (grass). */
  hutClearRadius: 4,
  /** Terrain clusters: count, tiles per cluster, distance band from the hut. */
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

/** Simulation rate. */
export const TICKS_PER_SEC = 10

export const ENEMIES: Record<EnemyKind, EnemySpec> = {
  raider: { hp: 10, speed: 1, damage: 2, cooldown: 10, range: 1.2 },
}

/** Enemies leave their path to attack a peasant or the mayor this close (tiles). */
export const ENEMY_AGGRO = 2.5

/** The mayor lives in the hut and fights in melee; the village is lost when the mayor dies. */
export const MAYOR = {
  hp: 25,
  damage: 3,
  cooldown: 10,
  range: 1.3,
  /** The mayor stands at the hut center; melee reach to and from the mayor counts from the hut wall. */
  radius: 0.5,
} as const

/** Peasants: workers stay at their building, idle ones walk to rock piles and throw. */
export const PEASANT = {
  hp: 10,
  /** Tiles per second on grass. */
  speed: 1.5,
  /** Tiles. */
  throwRange: 4,
  throwDamage: 4,
  /** Ticks between throws. */
  throwCooldown: 10,
  /** Rock flight speed, tiles per second. */
  rockSpeed: 8,
  /** One stone from the stockpile per this many throws. */
  throwsPerStone: 5,
} as const

/** Peasants that can throw from one rock pile. */
export const ROCK_PILE_SLOTS = 2

/** Waves per stage (index 0 = stage 1); later stages repeat the last entry. */
export const WAVES: WaveSpec[] = [
  { enemies: { raider: 5 }, interval: 20 },
  { enemies: { raider: 7 }, interval: 18 },
  { enemies: { raider: 9 }, interval: 16 },
  { enemies: { raider: 12 }, interval: 14 },
]

/** Loot for a won stage. */
export const PLUNDER = { wood: 10, stone: 5 } as const
