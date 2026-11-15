import { Scene } from "phaser"
import { MAP } from "../logic/balance.ts"
import { generateMap } from "../logic/map.ts"
import { Terrain } from "../logic/types.ts"
import { addCameraControls } from "./cameraControls.ts"
import { GRASS_ALT, KEEP_KEY, SPAWN_KEY, TERRAIN_KEY, TILE_PX } from "./textures.ts"

export class GameScene extends Scene {
  constructor() {
    super("Game")
  }

  create(data: { seed?: number }): void {
    const map = generateMap(data.seed ?? Date.now())
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = map.tiles[y * map.width + x] ?? Terrain.Grass
        // visual-only checker variation, not game logic
        const alt = t === Terrain.Grass && ((x * 73_856_093) ^ (y * 19_349_663)) % 7 === 0
        const key = alt ? GRASS_ALT : TERRAIN_KEY[t]
        this.add.image(x * TILE_PX, y * TILE_PX, key).setOrigin(0)
      }
    }
    this.add.image(map.keep.x * TILE_PX, map.keep.y * TILE_PX, KEEP_KEY).setOrigin(0)
    for (const s of map.spawns) this.add.image(s.x * TILE_PX, s.y * TILE_PX, SPAWN_KEY).setOrigin(0)

    const keepPx = (MAP.keepSize * TILE_PX) / 2
    addCameraControls(this, map.width * TILE_PX, map.height * TILE_PX, {
      x: map.keep.x * TILE_PX + keepPx,
      y: map.keep.y * TILE_PX + keepPx,
    })
  }
}
