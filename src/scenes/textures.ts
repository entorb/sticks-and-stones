import type { Scene } from "phaser"
import { MAP } from "../logic/balance.ts"
import { type BuildingType, Terrain } from "../logic/types.ts"

/** Tile size in world pixels. */
export const TILE_PX = 32

export const TERRAIN_KEY: Record<Terrain, string> = {
  [Terrain.Grass]: "t-grass",
  [Terrain.Forest]: "t-forest",
  [Terrain.Rock]: "t-rock",
  [Terrain.Water]: "t-water",
}
export const GRASS_ALT = "t-grass2"
export const HUT_KEY = "hut"
export const SPAWN_KEY = "spawn"
export const RAIDER_KEY = "u-raider"
export const PEASANT_KEY = "u-peasant"
export const ROCK_KEY = "rock"
export const MAYOR_KEY = "u-mayor"
export const buildingKey = (type: BuildingType) => `b-${type}`

type G = ReturnType<Scene["make"]["graphics"]>

const T = TILE_PX
const grass = (g: G, base: number, tuft: number) => {
  g.fillStyle(base).fillRect(0, 0, T, T)
  g.fillStyle(tuft)
  for (const [x, y] of [
    [5, 7],
    [20, 4],
    [12, 18],
    [26, 22],
    [7, 27],
  ] as const)
    g.fillRect(x, y, 2, 3)
}

/** Small person: body color, skin color. */
const figure = (g: G, body: number, skin: number) => {
  g.fillStyle(0x00_00_00, 0.25).fillEllipse(16, 28, 16, 5)
  g.fillStyle(body).fillRoundedRect(10, 13, 12, 14, 4)
  g.fillStyle(skin).fillCircle(16, 9, 5)
}

const DRAW: Record<string, (g: G) => void> = {
  [TERRAIN_KEY[Terrain.Grass]]: (g) => grass(g, 0x5c_8a_3a, 0x6f_9e_48),
  [GRASS_ALT]: (g) => grass(g, 0x58_85_3a, 0x4d_76_31),
  [TERRAIN_KEY[Terrain.Forest]]: (g) => {
    grass(g, 0x4a_72_31, 0x41_67_2b)
    for (const [x, y, r] of [
      [10, 12, 9],
      [23, 10, 8],
      [16, 23, 9],
    ] as const) {
      g.fillStyle(0x24_45_1c).fillCircle(x + 1, y + 2, r)
      g.fillStyle(0x2f_5e_24).fillCircle(x, y, r)
      g.fillStyle(0x3d_75_30).fillCircle(x - 2, y - 2, r / 2)
    }
  },
  [TERRAIN_KEY[Terrain.Rock]]: (g) => {
    g.fillStyle(0x7d_74_66).fillRect(0, 0, T, T)
    g.fillStyle(0x5d_56_4c).fillTriangle(2, 28, 14, 6, 26, 28)
    g.fillStyle(0x9b_92_84).fillTriangle(6, 28, 14, 6, 16, 28)
    g.fillStyle(0x6a_62_56).fillTriangle(16, 30, 24, 14, 31, 30)
  },
  [TERRAIN_KEY[Terrain.Water]]: (g) => {
    g.fillStyle(0x2f_6f_9e).fillRect(0, 0, T, T)
    g.lineStyle(2, 0x5a_98_c4)
    for (const y of [9, 22]) g.lineBetween(4, y, 12, y).lineBetween(18, y + 4, 27, y + 4)
  },
  [HUT_KEY]: (g) => {
    const s = T * MAP.hutSize
    g.fillStyle(0x00_00_00, 0.25).fillEllipse(s / 2, s - 5, s - 6, 10)
    g.fillStyle(0x7a_55_30).fillRect(8, 26, s - 16, s - 32)
    g.fillStyle(0x5e_40_22)
    for (let y = 32; y < s - 6; y += 7) g.fillRect(8, y, s - 16, 1)
    g.fillStyle(0xc9_a3_5a).fillTriangle(2, 30, s / 2, 4, s - 2, 30)
    g.fillStyle(0xa8_84_3f).fillTriangle(14, 30, s / 2, 14, s - 14, 30)
    g.fillStyle(0x3d_2a_1a).fillRect(s / 2 - 6, s - 22, 12, 16)
    g.fillStyle(0xf2_d2_7a)
      .fillRect(14, 36, 8, 7)
      .fillRect(s - 22, 36, 8, 7)
    g.fillStyle(0xb8_32_2a)
      .fillRect(s - 16, 0, 2, 14)
      .fillTriangle(s - 14, 0, s - 14, 7, s - 4, 3)
  },
  [MAYOR_KEY]: (g) => {
    figure(g, 0x2a_4f_9e, 0xe8_c3_9e)
    g.fillStyle(0x1b_1b_1b).fillRect(10, 2, 12, 3).fillRect(12, -1, 8, 4)
    g.fillStyle(0xd4_af_37).fillRect(14, 15, 4, 4)
  },
  [buildingKey("woodcutter")]: (g) => {
    g.fillStyle(0x6b_44_23).fillRect(5, 12, 22, 16)
    g.fillStyle(0x8b_2f_1f).fillTriangle(2, 13, 16, 2, 30, 13)
    g.fillStyle(0x3d_2a_1a).fillRect(13, 19, 6, 9)
    g.fillStyle(0xa0_70_3c).fillCircle(26, 27, 4).fillCircle(20, 29, 3)
  },
  [buildingKey("quarry")]: (g) => {
    g.fillStyle(0x8f_87_7a).fillRect(5, 12, 22, 16)
    g.fillStyle(0x4f_4a_43).fillTriangle(2, 13, 16, 3, 30, 13)
    g.fillStyle(0x3d_2a_1a).fillRect(13, 19, 6, 9)
    g.lineStyle(3, 0x5a_3b_1e).lineBetween(22, 30, 30, 20)
    g.fillStyle(0xcf_cf_cf).fillTriangle(26, 18, 31, 22, 31, 17)
  },
  [buildingKey("rockPile")]: (g) => {
    g.fillStyle(0x4d_48_40)
    for (const [x, y, r] of [
      [10, 24, 6],
      [21, 24, 6],
      [16, 16, 6],
    ] as const)
      g.fillCircle(x, y + 1, r)
    g.fillStyle(0xa3_9b_8e)
    for (const [x, y, r] of [
      [10, 24, 5],
      [21, 24, 5],
      [16, 16, 5],
    ] as const)
      g.fillCircle(x, y, r)
  },
  [RAIDER_KEY]: (g) => figure(g, 0x8e_1b_1b, 0xd9_a0_7a),
  [PEASANT_KEY]: (g) => figure(g, 0x9c_7a_4a, 0xe8_c3_9e),
  [ROCK_KEY]: (g) => {
    g.fillStyle(0x3d_3a_35).fillCircle(5, 5, 4)
    g.fillStyle(0xa3_9b_8e).fillCircle(4, 4, 3)
  },
  [SPAWN_KEY]: (g) => {
    g.fillStyle(0x3d_2a_1a).fillRect(8, 4, 3, 26)
    g.fillStyle(0xc0_39_2b).fillTriangle(11, 4, 11, 16, 28, 10)
  },
}

const SIZE: Record<string, number> = { [HUT_KEY]: T * MAP.hutSize, [ROCK_KEY]: 10 }

/** Build all procedural textures once (BootScene). */
export function makeTextures(scene: Scene): void {
  for (const [key, draw] of Object.entries(DRAW)) {
    const g = scene.make.graphics({}, false)
    draw(g)
    const size = SIZE[key] ?? T
    g.generateTexture(key, size, size)
    g.destroy()
  }
}
