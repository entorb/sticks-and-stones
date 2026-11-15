import { Scene } from "phaser"
import { makeTextures } from "./textures.ts"

export class BootScene extends Scene {
  constructor() {
    super("Boot")
  }

  create(): void {
    makeTextures(this)
    this.scene.start("Game")
  }
}
