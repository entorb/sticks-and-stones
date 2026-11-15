import { Scene } from "phaser"
import { CHECKPOINTS, PILE_ADVANCE } from "../logic/balance.ts"
import { buyPileAdvance, pileAdvanceCost } from "../logic/progression.ts"
import { loadProfile, loadVillage, saveProfile } from "./profile.ts"
import { BTN, FONT, REG, TEXT } from "./shared.ts"

/** Chrome's `beforeinstallprompt` event (not in the TS DOM lib). */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>
}
/** Set by main.ts when the browser offers to install the app. */
export const installPrompt: { event: InstallPromptEvent | null } = { event: null }

const BTN_W = 260
const BTN_H = 48
const GAP = 12

/** Start menu: continue the autosaved village, found a new one at a reached checkpoint, or buy
 * mayor advances with Renown. */
export class MenuScene extends Scene {
  constructor() {
    super("Menu")
  }

  create(): void {
    const { width, height } = this.scale
    const profile = loadProfile()
    this.registry.set(REG.profile, profile)
    const saved = loadVillage()
    const items: [string, object][] = []
    if (saved) items.push([`Continue · stage ${saved.stage}`, { resume: true }])
    for (const c of CHECKPOINTS.filter((x) => x.stage <= profile.checkpoint))
      items.push([`New village · stage ${c.stage}`, { checkpoint: c.stage }])
    const top = height / 2 - ((items.length + 1) * (BTN_H + GAP)) / 2
    this.add
      .text(width / 2, top - 70, "Sticks & Stones", {
        fontFamily: FONT,
        fontSize: "32px",
        color: TEXT,
      })
      .setOrigin(0.5)
    this.add
      .text(width / 2, top - 30, `Renown ${profile.renown}`, {
        fontFamily: FONT,
        fontSize: "16px",
        color: TEXT,
      })
      .setOrigin(0.5)
    const w = Math.min(BTN_W, width - GAP * 2)
    for (const [i, [label, data]] of items.entries())
      this.button(top + i * (BTN_H + GAP), w, label, () => this.scene.start("Game", data))
    const cost = pileAdvanceCost(profile)
    const advance =
      cost === undefined
        ? "Rock piles: all advances bought"
        : `Rock piles +${PILE_ADVANCE.rocks} · ${cost} Renown${profile.renown < cost ? " (too little)" : ""}`
    this.button(top + items.length * (BTN_H + GAP), w, advance, () => {
      if (!buyPileAdvance(profile)) return
      saveProfile(profile)
      this.scene.restart()
    })
    this.installLink(width, height)
    const onResize = () => this.scene.restart()
    this.scale.on("resize", onResize)
    this.events.once("shutdown", () => this.scale.off("resize", onResize))
  }

  /** Small link at the bottom (outside the button stack), only when the browser offers install. */
  private installLink(width: number, height: number): void {
    const { event } = installPrompt
    if (!event) return
    this.add
      .text(width / 2, height - GAP * 3, "Install as app", {
        fontFamily: FONT,
        fontSize: "16px",
        color: TEXT,
        backgroundColor: "#00000066",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => {
        installPrompt.event = null
        event.prompt().then(
          () => this.scene.restart(),
          () => this.scene.restart(),
        )
      })
  }

  private button(y: number, w: number, label: string, onTap: () => void): void {
    const { width } = this.scale
    const bg = this.add
      .rectangle(width / 2, y, w, BTN_H, BTN)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
    this.add
      .text(width / 2, y + BTN_H / 2, label, { fontFamily: FONT, fontSize: "16px", color: TEXT })
      .setOrigin(0.5)
    bg.on("pointerup", onTap)
  }
}
