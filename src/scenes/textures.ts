import type { Scene } from "phaser"
import { MAP } from "../logic/balance.ts"
import { type BuildingType, type EnemyKind, Terrain } from "../logic/types.ts"

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
export const PEASANT_KEY = "u-peasant"
export const ROCK_KEY = "rock"
export const MAYOR_KEY = "u-mayor"
export const buildingKey = (type: BuildingType) => `b-${type}`
const AXE_KEY = "tool-axe"
const PICK_KEY = "tool-pick"
/** Tool a work building's worker carries and swings; the handle end (hand) is at TOOL_GRIP. */
export const TOOL_KEY: Partial<Record<BuildingType, string>> = {
  woodcutter: AXE_KEY,
  quarry: PICK_KEY,
}
export const TOOL_GRIP = { x: 0.5, y: 0.875 } as const
const CLUB_KEY = "w-club"
const TORCH_KEY = "w-torch"
const SWORD_KEY = "w-sword"
/** Weapon an enemy holds and swings (same grip as tools); the ram has none. */
export const WEAPON_KEY: Partial<Record<EnemyKind, string>> = {
  raider: CLUB_KEY,
  torchbearer: TORCH_KEY,
  armored: SWORD_KEY,
}
export const enemyKey = (kind: EnemyKind) => `u-${kind}`

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

/** Row of sharpened stakes across the tile. */
const stakes = (g: G) => {
  for (let x = 1; x < T; x += 6) {
    g.fillStyle(0x5e_40_22).fillRect(x, 8, 5, 22)
    g.fillStyle(0x8a_62_38).fillRect(x + 1, 8, 2, 22)
    g.fillStyle(0x5e_40_22).fillTriangle(x, 8, x + 2.5, 2, x + 5, 8)
  }
  g.fillStyle(0x3d_2a_1a).fillRect(0, 14, T, 2).fillRect(0, 24, T, 2)
}

/** Grey stone blocks filling the tile. */
const blocks = (g: G, base: number, joint: number) => {
  g.fillStyle(joint).fillRect(0, 0, T, T)
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : -5
    for (let x = off; x < T; x += 10) g.fillStyle(base).fillRect(x + 1, row * 8 + 1, 9, 7)
  }
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
  [buildingKey("palisade")]: stakes,
  [buildingKey("gate")]: (g) => {
    stakes(g)
    g.fillStyle(0x3d_2a_1a).fillRect(8, 12, 16, 18)
    g.fillStyle(0x7a_55_30).fillRect(10, 14, 12, 16)
    g.lineStyle(1, 0x3d_2a_1a).lineBetween(16, 14, 16, 30)
  },
  [buildingKey("stoneWall")]: (g) => blocks(g, 0x9b_92_84, 0x5d_56_4c),
  [buildingKey("tower")]: (g) => {
    blocks(g, 0x8a_82_76, 0x4d_48_40)
    g.fillStyle(0x4d_48_40)
    for (let x = 0; x < T; x += 8) g.fillRect(x, 0, 4, 5)
    g.fillStyle(0x2a_26_22).fillRect(13, 12, 6, 9)
  },
  [enemyKey("raider")]: (g) => figure(g, 0x8e_1b_1b, 0xd9_a0_7a),
  [enemyKey("torchbearer")]: (g) => figure(g, 0xb5_4a_1a, 0xd9_a0_7a),
  [enemyKey("armored")]: (g) => {
    figure(g, 0x6b_6b_72, 0xd9_a0_7a)
    g.fillStyle(0x9a_9a_a2).fillRect(10, 3, 12, 4)
    g.fillStyle(0x8e_1b_1b).fillRect(12, 18, 8, 3)
  },
  [enemyKey("ram")]: (g) => {
    g.fillStyle(0x00_00_00, 0.25).fillEllipse(16, 28, 28, 6)
    g.fillStyle(0x8e_1b_1b).fillTriangle(4, 18, 16, 4, 28, 18)
    g.fillStyle(0x6b_44_23).fillRect(1, 17, 30, 7)
    g.fillStyle(0x4f_4a_43).fillRect(27, 16, 5, 9)
    g.fillStyle(0x3d_2a_1a).fillCircle(8, 26, 4).fillCircle(24, 26, 4)
  },
  [AXE_KEY]: (g) => {
    g.lineStyle(3, 0x5a_3b_1e).lineBetween(16, 28, 16, 6)
    g.fillStyle(0xcf_cf_cf).fillTriangle(16, 7, 26, 3, 26, 15)
  },
  [PICK_KEY]: (g) => {
    g.lineStyle(3, 0x5a_3b_1e).lineBetween(16, 28, 16, 6)
    g.fillStyle(0xcf_cf_cf).fillTriangle(4, 12, 16, 4, 16, 9).fillTriangle(28, 12, 16, 4, 16, 9)
  },
  [CLUB_KEY]: (g) => {
    g.lineStyle(3, 0x5a_3b_1e).lineBetween(16, 28, 16, 10)
    g.fillStyle(0x6b_44_23).fillCircle(16, 8, 5)
    g.fillStyle(0x3d_2a_1a).fillCircle(14, 6, 1).fillCircle(18, 9, 1)
  },
  [TORCH_KEY]: (g) => {
    g.lineStyle(3, 0x5e_40_22).lineBetween(16, 28, 16, 10)
    g.fillStyle(0xff_8c_1a).fillCircle(16, 7, 5)
    g.fillStyle(0xff_e0_5a).fillCircle(16, 8, 2.5)
  },
  [SWORD_KEY]: (g) => {
    g.fillStyle(0xcf_cf_cf).fillRect(14, 2, 4, 20)
    g.fillStyle(0xcf_cf_cf).fillTriangle(14, 2, 16, -1, 18, 2)
    g.fillStyle(0x6b_44_23).fillRect(10, 22, 12, 2)
    g.fillStyle(0x5a_3b_1e).fillRect(15, 24, 2, 5)
  },
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
