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

/** A lost village is refounded at the mayor's highest checkpoint with its start package. */
export const CHECKPOINTS = [
  { stage: 1, wood: 50, stone: 20, peasants: 4 },
  { stage: 6, wood: 120, stone: 60, peasants: 8 },
  { stage: 11, wood: 200, stone: 150, peasants: 12 },
  { stage: 16, wood: 300, stone: 250, peasants: 16 },
] as const

/** The mayor's permanent Renown: perStage × stage per won stage, bonus for a new checkpoint. */
export const RENOWN = { perStage: 1, checkpoint: 20 } as const

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
    rocks: 25,
  },
  palisade: {
    cost: { wood: 5, stone: 0 },
    workers: 0,
    produces: { wood: 0, stone: 0 },
    near: null,
    unlockStage: 5,
    hp: 40,
  },
  gate: {
    cost: { wood: 15, stone: 0 },
    workers: 0,
    produces: { wood: 0, stone: 0 },
    near: null,
    unlockStage: 5,
    hp: 40,
    peasantsPass: true,
  },
  stoneWall: {
    cost: { wood: 0, stone: 10 },
    workers: 0,
    produces: { wood: 0, stone: 0 },
    near: null,
    unlockStage: 10,
    hp: 150,
    peasantsPass: true,
    rangeBonus: 2,
  },
  tower: {
    cost: { wood: 0, stone: 30 },
    workers: 0,
    produces: { wood: 0, stone: 0 },
    near: null,
    unlockStage: 10,
    hp: 200,
    peasantsPass: true,
    rangeBonus: 3,
    rocks: 25,
  },
}

/** Building a stone wall on a palisade upgrades it in place for this price. */
export const UPGRADE = { from: "palisade", to: "stoneWall", cost: { wood: 0, stone: 8 } } as const

/** Wall repair in the build phase: 1 wood (wooden walls) or stone per this many HP. */
export const REPAIR_HP = 10

/** Peasants per tower; they stand on it and throw with its range bonus. */
export const TOWER_HOLDS = 3

/** Enemy flow field: a wall tile costs this many tiles of walking per HP, so enemies walk around
 * unless the detour is longer than breaking through. */
export const WALL_PATH_COST = 0.25

/** Fire (torchbearers) multiplies damage to wooden walls. */
export const FIRE_DAMAGE = 2

/** Each building of a type already standing adds this share of the base cost to the next one. */
export const COST_GROWTH = 0.5

/** Village Reputation per won stage (flawless = walls stood and took no damage); new peasants per
 * stage = 1 + floor(reputation / arrivalsPer). Waves scale by stage only. Reset on a lost village. */
export const REPUTATION = { win: 1, flawless: 2, arrivalsPer: 3 } as const

/** Share of the building cost refunded on sale (rounded down). */
export const SELL_REFUND = 0.5

/** Simulation rate. */
export const TICKS_PER_SEC = 10

export const ENEMIES: Record<EnemyKind, EnemySpec> = {
  raider: {
    hp: 10,
    speed: 1,
    damage: 2,
    cooldown: 10,
    range: 1.2,
    wallDamage: 2,
    fire: false,
    preys: true,
    loot: { wood: 1, stone: 1 },
  },
  /** Fast, burns wooden walls. */
  torchbearer: {
    hp: 8,
    speed: 1.6,
    damage: 2,
    cooldown: 10,
    range: 1.2,
    wallDamage: 3,
    fire: true,
    preys: true,
    loot: { wood: 2, stone: 0 },
  },
  armored: {
    hp: 28,
    speed: 0.8,
    damage: 3,
    cooldown: 12,
    range: 1.2,
    wallDamage: 3,
    fire: false,
    preys: true,
    loot: { wood: 1, stone: 2 },
  },
  /** Slow, tough, ignores peasants, breaks walls fast. */
  ram: {
    hp: 70,
    speed: 0.5,
    damage: 4,
    cooldown: 20,
    range: 1.2,
    wallDamage: 25,
    fire: false,
    preys: false,
    loot: { wood: 0, stone: 10 },
  },
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

/** Peasants fetch rocks at piles and throw; workers also hit with their tools. */
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
  /** Peasants in a tower stand this close to its center (tiles). */
  towerReach: 0.1,
  /** Peasants pick up a rock this close to the pile center, standing next to it (tiles). */
  pickupReach: 0.7,
  /** Peasants with a rock walk toward enemies this close to their pile (tiles). */
  alertRange: 7,
  /** Workers hit enemies this close with their axe or pick (tiles). */
  toolRange: 1.2,
  toolDamage: 2,
  /** Ticks between tool hits. */
  toolCooldown: 10,
} as const

/** Waves per stage (index 0 = stage 1); later stages repeat the last entry. Mini bosses at 5
 * (large mob) and 10 (rams); the stage after a boss is a breather. */
export const WAVES: WaveSpec[] = [
  { enemies: { raider: 5 }, interval: 20 },
  { enemies: { raider: 7 }, interval: 18 },
  { enemies: { raider: 9 }, interval: 16 },
  { enemies: { raider: 12 }, interval: 14 },
  { enemies: { raider: 24 }, interval: 6 },
  { enemies: { raider: 8, torchbearer: 4 }, interval: 14 },
  { enemies: { raider: 9, torchbearer: 5, armored: 2 }, interval: 13 },
  { enemies: { raider: 10, torchbearer: 6, armored: 3 }, interval: 12 },
  { enemies: { raider: 11, torchbearer: 7, armored: 5 }, interval: 11 },
  { enemies: { ram: 2, armored: 6, raider: 10, torchbearer: 4 }, interval: 12 },
]
