import type { Scene } from "phaser"
import { MAP } from "../logic/balance.ts"
import { Terrain } from "../logic/types.ts"

/** Tile size in world pixels. */
export const TILE_PX = 32

export const TERRAIN_KEY: Record<Terrain, string> = {
  [Terrain.Grass]: "t-grass",
  [Terrain.Forest]: "t-forest",
  [Terrain.Rock]: "t-rock",
  [Terrain.Water]: "t-water",
}
export const GRASS_ALT = "t-grass2"
export const KEEP_KEY = "keep"
export const SPAWN_KEY = "spawn"

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
  [KEEP_KEY]: (g) => {
    const s = T * MAP.keepSize
    g.fillStyle(0x3d_34_2a).fillRect(4, 8, s - 8, s - 8)
    g.fillStyle(0x9a_94_88).fillRect(6, 10, s - 12, s - 14)
    for (let x = 6; x < s - 6; x += 10) g.fillRect(x, 4, 6, 8)
    g.fillStyle(0x5a_3b_1e).fillRect(s / 2 - 6, s - 22, 12, 16)
    g.fillStyle(0xb8_32_2a).fillTriangle(s / 2, 0, s / 2, 12, s / 2 + 12, 6)
  },
  [SPAWN_KEY]: (g) => {
    g.fillStyle(0x3d_2a_1a).fillRect(8, 4, 3, 26)
    g.fillStyle(0xc0_39_2b).fillTriangle(11, 4, 11, 16, 28, 10)
  },
}

/** Build all procedural textures once (BootScene). */
export function makeTextures(scene: Scene): void {
  for (const [key, draw] of Object.entries(DRAW)) {
    const g = scene.make.graphics({}, false)
    draw(g)
    const size = key === KEEP_KEY ? T * MAP.keepSize : T
    g.generateTexture(key, size, size)
    g.destroy()
  }
}
