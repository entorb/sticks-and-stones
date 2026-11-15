import { Scene } from "phaser"

export class GameScene extends Scene {
  constructor() {
    super("Game")
  }

  create(): void {
    const { width, height } = this.scale
    this.add
      .text(width / 2, height / 2, "Sticks & Stones\nDefend the Village", {
        fontFamily: "serif",
        fontSize: "32px",
        color: "#f4e9c8",
        align: "center",
      })
      .setOrigin(0.5)
  }
}
