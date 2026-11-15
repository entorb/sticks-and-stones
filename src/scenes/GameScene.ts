import { type GameObjects, Scene } from "phaser"
import { BUILDINGS, MAP } from "../logic/balance.ts"
import {
  type PlaceError,
  placeBuilding,
  placeError,
  sellBuilding,
  toggleWorkers,
} from "../logic/building.ts"
import { buildingAt, newGame } from "../logic/state.ts"
import { type BuildingType, type GameState, Terrain } from "../logic/types.ts"
import { addCameraControls } from "./cameraControls.ts"
import { BAR_H, EV, HUD_H, REG, type Tool } from "./shared.ts"
import { buildingKey, GRASS_ALT, KEEP_KEY, SPAWN_KEY, TERRAIN_KEY, TILE_PX } from "./textures.ts"

const UNSTAFFED_ALPHA = 0.5
const HOVER_OK = 0x7c_fc_00
const HOVER_BAD = 0xff_3b_30

const ERROR_TEXT: Record<PlaceError, string> = {
  locked: "Not unlocked yet",
  terrain: "Build on grass",
  occupied: "Tile is taken",
  notNear: "",
  cost: "Not enough resources",
}
const NEAR_TEXT: Partial<Record<BuildingType, string>> = {
  woodcutter: "Must be next to forest",
  quarry: "Must be next to rock",
}

export class GameScene extends Scene {
  private state!: GameState
  private buildingLayer!: GameObjects.Container
  private hover!: GameObjects.Graphics

  constructor() {
    super("Game")
  }

  create(data: { seed?: number }): void {
    this.state = newGame(data.seed ?? Date.now())
    this.registry.set(REG.state, this.state)
    this.registry.set(REG.tool, null)
    this.drawMap()
    this.buildingLayer = this.add.container()
    this.hover = this.add.graphics()
    this.drawBuildings()

    const { map } = this.state
    const keepPx = (MAP.keepSize * TILE_PX) / 2
    addCameraControls(this, {
      world: { width: map.width * TILE_PX, height: map.height * TILE_PX },
      focus: { x: map.keep.x * TILE_PX + keepPx, y: map.keep.y * TILE_PX + keepPx },
      insets: { top: HUD_H, bottom: BAR_H },
      onTap: (wx, wy) => this.tap(Math.floor(wx / TILE_PX), Math.floor(wy / TILE_PX)),
    })
    this.input.on("pointermove", () => this.drawHover())

    const onChanged = () => this.drawBuildings()
    this.game.events.on(EV.changed, onChanged)
    this.events.once("shutdown", () => this.game.events.off(EV.changed, onChanged))
    this.scene.launch("UI")
  }

  private drawMap(): void {
    const { map } = this.state
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = map.tiles[y * map.width + x] ?? Terrain.Grass
        // visual-only grass variation, not game logic
        const alt = t === Terrain.Grass && ((x * 73_856_093) ^ (y * 19_349_663)) % 7 === 0
        const key = alt ? GRASS_ALT : TERRAIN_KEY[t]
        this.add.image(x * TILE_PX, y * TILE_PX, key).setOrigin(0)
      }
    }
    this.add.image(map.keep.x * TILE_PX, map.keep.y * TILE_PX, KEEP_KEY).setOrigin(0)
    for (const s of map.spawns) this.add.image(s.x * TILE_PX, s.y * TILE_PX, SPAWN_KEY).setOrigin(0)
  }

  private drawBuildings(): void {
    this.buildingLayer.removeAll(true)
    for (const b of this.state.buildings) {
      const staffed = b.workers >= BUILDINGS[b.type].workers
      const img = this.add.image(b.x * TILE_PX, b.y * TILE_PX, buildingKey(b.type)).setOrigin(0)
      this.buildingLayer.add(img.setAlpha(staffed ? 1 : UNSTAFFED_ALPHA))
    }
  }

  private drawHover(): void {
    this.hover.clear()
    const tool = this.registry.get(REG.tool) as Tool
    const p = this.input.activePointer
    if (!tool || tool === "sell" || p.isDown) return
    const w = this.cameras.main.getWorldPoint(p.x, p.y)
    const x = Math.floor(w.x / TILE_PX)
    const y = Math.floor(w.y / TILE_PX)
    const color = placeError(this.state, tool, x, y) ? HOVER_BAD : HOVER_OK
    this.hover
      .lineStyle(2, color)
      .strokeRect(x * TILE_PX + 1, y * TILE_PX + 1, TILE_PX - 2, TILE_PX - 2)
  }

  private tap(x: number, y: number): void {
    const tool = this.registry.get(REG.tool) as Tool
    const b = buildingAt(this.state, x, y)
    if (tool === "sell") {
      if (b) sellBuilding(this.state, b.id)
    } else if (tool) {
      const err = placeBuilding(this.state, tool, x, y)
      if (err)
        this.game.events.emit(EV.toast, err === "notNear" ? NEAR_TEXT[tool] : ERROR_TEXT[err])
    } else if (b && !toggleWorkers(this.state, b.id) && BUILDINGS[b.type].workers > 0) {
      this.game.events.emit(EV.toast, "No idle peasants")
    }
    this.game.events.emit(EV.changed)
    this.drawHover()
  }
}
