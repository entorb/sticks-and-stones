import { AUTO, Game, Scale, type Types } from "phaser"
import { VIEW } from "./logic/balance.ts"
import { BootScene } from "./scenes/BootScene.ts"
import { GameScene } from "./scenes/GameScene.ts"
import { UIScene } from "./scenes/UIScene.ts"

const config: Types.Core.GameConfig = {
  type: AUTO,
  width: VIEW.width,
  height: VIEW.height,
  parent: "game-container",
  backgroundColor: "#2b3a1f",
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  scene: [BootScene, GameScene, UIScene],
}

document.addEventListener("DOMContentLoaded", () => {
  const game = new Game(config)
  // Dev-only handle for browser debugging (Playwright `page.evaluate`).
  if (import.meta.env.DEV) {
    ;(globalThis as unknown as { __game: unknown }).__game = game
  }
})
