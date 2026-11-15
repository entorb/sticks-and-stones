import { type GameObjects, Scene } from "phaser"
import { BUILDINGS, PEASANT, TICKS_PER_SEC } from "../logic/balance.ts"
import { type Battle, dist } from "../logic/battle.ts"
import {
  type PlaceError,
  placeBuilding,
  placeError,
  sellBuilding,
  toggleWorkers,
} from "../logic/building.ts"
import { startWave, stepBattle, winStage } from "../logic/combat.ts"
import { hutCenter, hutTiles } from "../logic/map.ts"
import { flowField, lineWalkable, waypoint } from "../logic/pathing.ts"
import { buildingAt, newGame } from "../logic/state.ts"
import { type BuildingType, type GameState, type Point, Terrain } from "../logic/types.ts"
import { BattleView } from "./battleView.ts"
import { addCameraControls } from "./cameraControls.ts"
import { BAR_H, EV, HUD_H, REG, type Tool } from "./shared.ts"
import { buildingKey, GRASS_ALT, HUT_KEY, SPAWN_KEY, TERRAIN_KEY, TILE_PX } from "./textures.ts"

const TICK_MS = 1000 / TICKS_PER_SEC
const LOSS_DELAY_MS = 2500
const UNSTAFFED_ALPHA = 0.5
const HOVER_OK = 0x7c_fc_00
const HOVER_BAD = 0xff_3b_30
const PATH_COLOR = 0xf4_e9_c8
const PATH_ALPHA = 0.55
const PATH_DOT = 3
/** Tiles between path dots. */
const PATH_GAP = 0.8
const MAX_PATH_LEGS = 100

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
  private path!: GameObjects.Graphics
  private battle: Battle | null = null
  private view: BattleView | null = null
  private acc = 0

  constructor() {
    super("Game")
  }

  create(data: { seed?: number }): void {
    this.state = newGame(data.seed ?? Date.now())
    this.registry.set(REG.state, this.state)
    this.registry.set(REG.tool, null)
    this.registry.set(REG.battle, null)
    this.battle = null
    this.drawMap()
    this.path = this.add.graphics()
    this.drawPath()
    this.buildingLayer = this.add.container()
    this.hover = this.add.graphics()
    this.drawBuildings()

    const { map } = this.state
    addCameraControls(this, {
      world: { width: map.width * TILE_PX, height: map.height * TILE_PX },
      focus: { x: (hutCenter(map).x + 0.5) * TILE_PX, y: (hutCenter(map).y + 0.5) * TILE_PX },
      insets: { top: HUD_H, bottom: BAR_H },
      onTap: (wx, wy) => this.tap(Math.floor(wx / TILE_PX), Math.floor(wy / TILE_PX)),
    })
    this.input.on("pointermove", () => this.drawHover())

    const onDefend = () => this.startDefense()
    this.game.events.on(EV.defend, onDefend)
    this.events.once("shutdown", () => {
      this.game.events.off(EV.defend, onDefend)
      this.view?.destroy()
    })
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
    this.add.image(map.hut.x * TILE_PX, map.hut.y * TILE_PX, HUT_KEY).setOrigin(0)
    for (const s of map.spawns) this.add.image(s.x * TILE_PX, s.y * TILE_PX, SPAWN_KEY).setOrigin(0)
  }

  /** Dotted enemy route from each spawn to the hut (build phase only), as enemies walk it. */
  private drawPath(): void {
    const { map } = this.state
    const field = flowField(map, hutTiles(map))
    const hut = hutCenter(map)
    this.path.clear().fillStyle(PATH_COLOR, PATH_ALPHA)
    for (const s of map.spawns) {
      let pos: Point = s
      for (let n = 0; n < MAX_PATH_LEGS && dist(pos, hut) > 0; n++) {
        const next = lineWalkable(map, pos, hut) ? hut : waypoint(map, field, pos)
        if (!next) break
        const steps = Math.ceil(dist(pos, next) / PATH_GAP)
        for (let k = 1; k <= steps; k++) {
          const x = pos.x + ((next.x - pos.x) * k) / steps
          const y = pos.y + ((next.y - pos.y) * k) / steps
          this.path.fillCircle((x + 0.5) * TILE_PX, (y + 0.5) * TILE_PX, PATH_DOT)
        }
        pos = next
      }
    }
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
    if (!tool || tool === "sell" || p.isDown || this.battle) return
    const w = this.cameras.main.getWorldPoint(p.x, p.y)
    const x = Math.floor(w.x / TILE_PX)
    const y = Math.floor(w.y / TILE_PX)
    const color = placeError(this.state, tool, x, y) ? HOVER_BAD : HOVER_OK
    this.hover
      .lineStyle(2, color)
      .strokeRect(x * TILE_PX + 1, y * TILE_PX + 1, TILE_PX - 2, TILE_PX - 2)
    if (tool !== "rockPile") return
    const r = PEASANT.throwRange * TILE_PX
    this.hover.lineStyle(2, color, 0.6).strokeCircle((x + 0.5) * TILE_PX, (y + 0.5) * TILE_PX, r)
  }

  override update(_time: number, delta: number): void {
    const b = this.battle
    if (!(b && this.view) || b.result !== "running") return
    this.acc += delta
    while (this.acc >= TICK_MS && b.result === "running") {
      this.acc -= TICK_MS
      stepBattle(this.state, b, TICKS_PER_SEC)
      this.view.events(b)
      this.game.events.emit(EV.changed)
    }
    this.view.render(b, Math.min(1, this.acc / TICK_MS))
    if (b.result !== "running") this.endDefense(b)
  }

  private startDefense(): void {
    if (this.battle) return
    this.registry.set(REG.tool, null)
    this.hover.clear()
    this.battle = startWave(this.state)
    this.registry.set(REG.battle, this.battle)
    this.view = new BattleView(this)
    this.path.setVisible(false)
    this.acc = 0
    this.game.events.emit(EV.changed)
  }

  private endDefense(b: Battle): void {
    if (b.result === "lost") {
      // shortcut: no mayor/checkpoints yet (M6), a loss restarts at stage 1
      this.game.events.emit(EV.toast, "The mayor has fallen. The village is lost!")
      this.time.delayedCall(LOSS_DELAY_MS, () => this.scene.restart({}))
      return
    }
    this.view?.destroy()
    this.view = null
    this.battle = null
    this.path.setVisible(true)
    this.registry.set(REG.battle, null)
    const gain = winStage(this.state)
    this.game.events.emit(EV.toast, `Victory! +${gain.wood} wood, +${gain.stone} stone`)
    this.game.events.emit(EV.changed)
  }

  private tap(x: number, y: number): void {
    if (this.battle) return
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
    this.drawBuildings()
    this.game.events.emit(EV.changed)
    this.drawHover()
  }
}
