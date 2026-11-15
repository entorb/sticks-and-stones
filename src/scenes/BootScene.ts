import { Scene } from "phaser"

export class BootScene extends Scene {
  constructor() {
    super("Boot")
  }

  create(): void {
    this.scene.start("Game")
  }
}
