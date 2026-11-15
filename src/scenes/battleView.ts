import type { GameObjects, Scene } from "phaser"
import type { Battle } from "../logic/combat.ts"
import type { Point } from "../logic/types.ts"
import { PEASANT_KEY, RAIDER_KEY, ROCK_KEY, TILE_PX } from "./textures.ts"

const ROCK_FLIGHT_MS = 180
/** Two throwers share a pile tile: shift them apart (px). */
const SLOT_SHIFT = 7
/** Throwers stand behind their pile so it stays visible (px). */
const PILE_LIFT = 8

const px = (tile: number) => (tile + 0.5) * TILE_PX

/** Sprites for one battle: enemies (interpolated), throwers, flying rocks. */
export class BattleView {
  private readonly enemies = new Map<number, GameObjects.Image>()
  private readonly throwers = new Map<number, GameObjects.Image>()

  constructor(private readonly scene: Scene) {}

  /** Sync sprites with the battle; `alpha` = progress (0..1) toward the next tick. */
  render(b: Battle, alpha: number): void {
    const alive = new Set<number>()
    for (const e of b.enemies) {
      alive.add(e.id)
      let img = this.enemies.get(e.id)
      if (!img) {
        img = this.scene.add.image(0, 0, RAIDER_KEY).setDepth(2)
        this.enemies.set(e.id, img)
      }
      img.setPosition(px(e.px + (e.x - e.px) * alpha), px(e.py + (e.y - e.py) * alpha))
    }
    prune(this.enemies, alive)
    alive.clear()
    for (const t of b.throwers) {
      alive.add(t.id)
      if (this.throwers.has(t.id)) continue
      const shift = t.id % 2 === 0 ? SLOT_SHIFT : -SLOT_SHIFT
      this.throwers.set(
        t.id,
        this.scene.add.image(px(t.x) + shift, px(t.y) - PILE_LIFT, PEASANT_KEY).setDepth(2),
      )
    }
    prune(this.throwers, alive)
  }

  /** Visualize this tick's throws. */
  throws(b: Battle): void {
    for (const ev of b.events) if (ev.type === "throw") this.rock(ev.from, ev.to)
  }

  private rock(from: Point, to: Point): void {
    const img = this.scene.add.image(px(from.x), px(from.y), ROCK_KEY).setDepth(3)
    this.scene.tweens.add({
      targets: img,
      x: px(to.x),
      y: px(to.y),
      duration: ROCK_FLIGHT_MS,
      onComplete: () => img.destroy(),
    })
  }

  destroy(): void {
    prune(this.enemies, new Set())
    prune(this.throwers, new Set())
  }
}

function prune(sprites: Map<number, GameObjects.Image>, alive: Set<number>): void {
  for (const [id, img] of sprites) {
    if (alive.has(id)) continue
    img.destroy()
    sprites.delete(id)
  }
}
