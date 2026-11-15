import { type GameObjects, Scene } from "phaser"
import { BUILDINGS, MAYOR } from "../logic/balance.ts"
import type { Battle } from "../logic/battle.ts"
import { buildCost } from "../logic/building.ts"
import { idlePeasants } from "../logic/state.ts"
import type { BuildingType, GameState, Profile, Resources } from "../logic/types.ts"
import { BAR_H, BTN, EV, FONT, HUD_H, PANEL, REG, TEXT, type Tool } from "./shared.ts"

const PAD = 6
/** Below this screen width (px) the HUD uses a smaller font. */
const NARROW = 480
const BTN_MAX_W = 120
const BTN_MIN_W = 64
const TOAST_MS = 1800
const BTN_ON = 0xc9_a2_27

const NAMES: Record<BuildingType, string> = {
  woodcutter: "Woodcutter",
  quarry: "Quarry",
  rockPile: "Rock pile",
  palisade: "Palisade",
  gate: "Gate",
  stoneWall: "Stone wall",
  tower: "Tower",
}

/** Tooltip shown as a toast when a build tool is picked. */
const HINTS: Record<BuildingType, string> = {
  woodcutter: "Next to forest. 1 worker chops wood each stage.",
  quarry: "Next to rock. 1 worker cuts stone each stage.",
  rockPile: "Peasants fetch rocks here to throw. Refilled each stage.",
  palisade: "Wooden wall, blocks foes until broken. Tap to repair.",
  gate: "Lets peasants through, blocks foes.",
  stoneWall: "Strong wall, peasants on it throw farther. Build on a palisade to upgrade.",
  tower: "Holds rocks, longer throw range.",
}
const SPEEDS = [1, 2, 4]

const costText = (c: Resources) =>
  [c.wood && `${c.wood} wood`, c.stone && `${c.stone} stone`].filter(Boolean).join(" ")

interface Button {
  tool: Tool | "defend"
  bg: GameObjects.Rectangle
  text: GameObjects.Text
}

/** HUD (top) and build bar (bottom), runs on top of GameScene. */
export class UIScene extends Scene {
  private hud!: GameObjects.Text
  private toast!: GameObjects.Text
  private buttons: Button[] = []
  private bar!: GameObjects.Container
  /** Build items shown (unlocked ones); the bar is rebuilt when this changes. */
  private shown = 0

  constructor() {
    super("UI")
  }

  private get state(): GameState {
    return this.registry.get(REG.state) as GameState
  }

  create(): void {
    const { width, height } = this.scale
    // interactive panels swallow taps so they don't reach the map below
    this.add.rectangle(0, 0, width, HUD_H, PANEL, 0.85).setOrigin(0).setInteractive()
    this.hud = this.add.text(PAD * 2, HUD_H / 2, "", {
      fontFamily: FONT,
      fontSize: width < NARROW ? "12px" : "15px",
      color: TEXT,
      // phones: two lines fit in HUD_H
      wordWrap: { width: width - PAD * 4 },
    })
    this.hud.setOrigin(0, 0.5)
    this.bar = this.add.container()
    this.toast = this.add
      .text(width / 2, height - BAR_H - PAD * 2, "", {
        fontFamily: FONT,
        fontSize: "16px",
        color: TEXT,
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
        align: "center",
        wordWrap: { width: width - PAD * 4 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false)
    this.makeBar()
    this.refresh()

    const onChanged = () => this.refresh()
    const onToast = (msg: string) => this.showToast(msg)
    const onResize = () => this.scene.restart()
    this.game.events.on(EV.changed, onChanged)
    this.game.events.on(EV.toast, onToast)
    this.scale.on("resize", onResize)
    this.events.once("shutdown", () => {
      this.game.events.off(EV.changed, onChanged)
      this.game.events.off(EV.toast, onToast)
      this.scale.off("resize", onResize)
    })
  }

  /** Build bar with the unlocked buildings; wraps into rows when buttons get too narrow. */
  private makeBar(): void {
    const { width, height } = this.scale
    this.bar.removeAll(true)
    const unlocked = (Object.keys(NAMES) as BuildingType[]).filter(
      (t) => BUILDINGS[t].unlockStage <= this.state.stage,
    )
    this.shown = unlocked.length
    const items: [Tool | "defend", string][] = [
      ...unlocked.map((t): [Tool, string] => [t, NAMES[t]]),
      ["defend", "Defend!"],
    ]
    const cols = Math.min(items.length, Math.floor((width - PAD) / (BTN_MIN_W + PAD)))
    const rows = Math.ceil(items.length / cols)
    const w = Math.min(BTN_MAX_W, (width - PAD * (cols + 1)) / cols)
    const h = BAR_H - PAD * 2
    const barH = rows * (h + PAD) + PAD
    const top = height - barH
    const panel = this.add.rectangle(0, top, width, barH, PANEL, 0.85).setOrigin(0)
    this.bar.add(panel.setInteractive())
    this.toast.setY(top - PAD * 2)
    this.registry.set(REG.barH, barH)
    const x0 = (width - (w * cols + PAD * (cols - 1))) / 2
    this.buttons = items.map(([tool, label], i) => {
      const x = x0 + (i % cols) * (w + PAD)
      const y = top + PAD + Math.floor(i / cols) * (h + PAD)
      const bg = this.add
        .rectangle(x, y, w, h, BTN)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
      const text = this.add
        .text(x + w / 2, y + h / 2, label, {
          fontFamily: FONT,
          fontSize: "12px",
          color: TEXT,
          align: "center",
        })
        .setOrigin(0.5)
      bg.on("pointerup", () => this.press(tool))
      this.bar.add([bg, text])
      return { tool, bg, text }
    })
  }

  private press(tool: Tool | "defend"): void {
    if (this.registry.get(REG.battle)) {
      if (tool !== "defend") return
      const speed = this.registry.get(REG.speed) as number
      this.registry.set(REG.speed, SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1)
      this.refresh()
      return
    }
    if (tool === "defend") {
      this.game.events.emit(EV.defend)
      return
    }
    const current = this.registry.get(REG.tool) as Tool
    this.registry.set(REG.tool, current === tool ? null : tool)
    if (tool && current !== tool) this.showToast(HINTS[tool])
    this.refresh()
  }

  private refresh(): void {
    const s = this.state
    const unlocked = Object.values(BUILDINGS).filter((x) => x.unlockStage <= s.stage).length
    if (unlocked !== this.shown) this.makeBar()
    const b = this.registry.get(REG.battle) as Battle | null
    const mayor = b ? Math.max(0, b.mayor.hp) : MAYOR.hp
    const people = b
      ? `Foes ${b.enemies.length + b.spawns.length}`
      : `Idle ${idlePeasants(s)}/${s.peasants}`
    const renown = (this.registry.get(REG.profile) as Profile).renown
    this.hud.setText(
      `Stage ${s.stage} · Rep ${s.reputation} · Renown ${renown} · Wood ${s.res.wood} · Stone ${s.res.stone} · Mayor ${mayor} · ${people}`,
    )
    const tool = this.registry.get(REG.tool) as Tool
    for (const btn of this.buttons) {
      btn.bg.setFillStyle(btn.tool === tool ? BTN_ON : BTN)
      btn.bg.setAlpha(b && btn.tool !== "defend" ? 0.4 : 1)
      btn.text.setText(this.label(btn.tool, b !== null))
    }
  }

  /** Building name + cost; the Defend! button shows the speed toggle during a battle. */
  private label(tool: Tool | "defend", battle: boolean): string {
    if (tool === "defend") return battle ? `Speed ${this.registry.get(REG.speed)}×` : "Defend!"
    return tool ? `${NAMES[tool]}\n${costText(buildCost(this.state, tool))}` : ""
  }

  private showToast(msg: string): void {
    this.toast.setText(msg).setVisible(true)
    this.time.removeAllEvents()
    this.time.delayedCall(TOAST_MS, () => this.toast.setVisible(false))
  }
}
