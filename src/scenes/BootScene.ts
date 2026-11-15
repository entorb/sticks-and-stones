import { Scene } from "phaser"
import { makeTextures } from "./textures.ts"

export class BootScene extends Scene {
  constructor() {
    super("Boot")
  }

  create(): void {
    makeTextures(this)
    // dev scenario params (see GameScene) skip the menu
    const dev = import.meta.env.DEV && location.search.length > 1
    this.scene.start(dev ? "Game" : "Menu")
  }
}
