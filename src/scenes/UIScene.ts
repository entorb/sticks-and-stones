import { type GameObjects, Scene } from "phaser"
import { MAYOR } from "../logic/balance.ts"
import type { Battle } from "../logic/battle.ts"
import { buildCost } from "../logic/building.ts"
import { idlePeasants } from "../logic/state.ts"
import type { BuildingType, GameState, Resources } from "../logic/types.ts"
import { BAR_H, EV, HUD_H, REG, type Tool } from "./shared.ts"

const PAD = 6
/** Below this screen width (px) the HUD uses a smaller font. */
const NARROW = 480
const BTN_MAX_W = 120
const TOAST_MS = 1800
const FONT = "sans-serif"
const PANEL = 0x1e_16_0e
const BTN = 0x4a_38_26
const BTN_ON = 0xc9_a2_27
const TEXT = "#f4e9c8"

const NAMES: Record<BuildingType, string> = {
  woodcutter: "Woodcutter",
  quarry: "Quarry",
  rockPile: "Rock pile",
}

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
      fontSize: width < NARROW ? "13px" : "15px",
      color: TEXT,
    })
    this.hud.setOrigin(0, 0.5)
    this.add
      .rectangle(0, height - BAR_H, width, BAR_H, PANEL, 0.85)
      .setOrigin(0)
      .setInteractive()
    this.toast = this.add
      .text(width / 2, height - BAR_H - PAD * 2, "", {
        fontFamily: FONT,
        fontSize: "16px",
        color: TEXT,
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
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

  private makeBar(): void {
    const { width, height } = this.scale
    const items: [Tool | "defend", string][] = [
      ...(Object.keys(NAMES) as BuildingType[]).map((t): [Tool, string] => [t, NAMES[t]]),
      ["sell", "Sell\n50% back"],
      ["defend", "Defend!"],
    ]
    const w = Math.min(BTN_MAX_W, (width - PAD * (items.length + 1)) / items.length)
    const h = BAR_H - PAD * 2
    const x0 = (width - (w * items.length + PAD * (items.length - 1))) / 2
    this.buttons = items.map(([tool, label], i) => {
      const x = x0 + i * (w + PAD)
      const y = height - BAR_H + PAD
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
      return { tool, bg, text }
    })
  }

  private press(tool: Tool | "defend"): void {
    if (this.registry.get(REG.battle)) return
    if (tool === "defend") {
      this.game.events.emit(EV.defend)
      return
    }
    const current = this.registry.get(REG.tool) as Tool
    this.registry.set(REG.tool, current === tool ? null : tool)
    this.refresh()
  }

  private refresh(): void {
    const s = this.state
    const b = this.registry.get(REG.battle) as Battle | null
    const mayor = b ? Math.max(0, b.mayor.hp) : MAYOR.hp
    const people = b
      ? `Foes ${b.enemies.length + b.spawns.length}`
      : `Idle ${idlePeasants(s)}/${s.peasants}`
    this.hud.setText(
      `Stage ${s.stage} · Rep ${s.reputation} · Wood ${s.res.wood} · Stone ${s.res.stone} · Mayor ${mayor} · ${people}`,
    )
    const tool = this.registry.get(REG.tool) as Tool
    for (const btn of this.buttons) {
      btn.bg.setFillStyle(btn.tool === tool ? BTN_ON : BTN).setAlpha(b ? 0.4 : 1)
      const type = btn.tool as BuildingType
      if (type in NAMES) btn.text.setText(`${NAMES[type]}\n${costText(buildCost(s, type))}`)
    }
  }

  private showToast(msg: string): void {
    this.toast.setText(msg).setVisible(true)
    this.time.removeAllEvents()
    this.time.delayedCall(TOAST_MS, () => this.toast.setVisible(false))
  }
}
