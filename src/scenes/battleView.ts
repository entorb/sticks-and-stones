import type { GameObjects, Scene } from "phaser"
import { ENEMIES } from "../logic/balance.ts"
import type { Battle, Enemy } from "../logic/combat.ts"
import { PEASANT_KEY, RAIDER_KEY, ROCK_KEY, TILE_PX } from "./textures.ts"

/** Two throwers share a pile tile: shift them apart (px). */
const SLOT_SHIFT = 7
/** Throwers stand behind their pile so it stays visible (px). */
const PILE_LIFT = 8
/** Peak height of a rock's arc (px). */
const ARC_PX = 18
const ROCK_SCALE = 1.4
const HIT_TINT = 0xff_60_40
const HIT_MS = 120
const DEATH_MS = 300
const THROW_MS = 90
const HP_W = 20
const HP_H = 3
const HP_Y = 18

const px = (tile: number) => (tile + 0.5) * TILE_PX
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Sprites for one battle: enemies (interpolated, HP bars), throwers, flying rocks. */
export class BattleView {
  private readonly scene: Scene
  private readonly enemies = new Map<number, GameObjects.Image>()
  private readonly throwers = new Map<number, GameObjects.Image>()
  private readonly rocks = new Map<number, GameObjects.Image>()
  private readonly bars: GameObjects.Graphics

  constructor(scene: Scene) {
    this.scene = scene
    this.bars = scene.add.graphics().setDepth(4)
  }

  /** Sync sprites with the battle; `alpha` = progress (0..1) toward the next tick. */
  render(b: Battle, alpha: number): void {
    this.bars.clear()
    sync(
      this.enemies,
      b.enemies,
      () => this.scene.add.image(0, 0, RAIDER_KEY).setDepth(2),
      (img, e) => {
        img.setPosition(px(lerp(e.px, e.x, alpha)), px(lerp(e.py, e.y, alpha)))
        this.hpBar(img, e)
      },
    )
    sync(this.throwers, b.throwers, (t) => {
      const shift = t.id % 2 === 0 ? SLOT_SHIFT : -SLOT_SHIFT
      return this.scene.add.image(px(t.x) + shift, px(t.y) - PILE_LIFT, PEASANT_KEY).setDepth(2)
    })
    sync(
      this.rocks,
      b.rocks,
      () => this.scene.add.image(0, 0, ROCK_KEY).setDepth(3).setScale(ROCK_SCALE),
      (img, r) => {
        const t = Math.min(1, (r.total - r.ticks + alpha) / r.total)
        const arc = Math.sin(t * Math.PI) * ARC_PX
        img.setPosition(
          px(lerp(r.from.x, r.to.x, t)),
          px(lerp(r.from.y, r.to.y, t)) - PILE_LIFT * (1 - t) - arc,
        )
      },
    )
  }

  /** Animate this tick's events (call before `render`, which removes dead sprites). */
  events(b: Battle): void {
    for (const ev of b.events) {
      if (ev.type === "throw") this.pulse(this.throwers.get(ev.throwerId))
      else if (ev.type === "hit") this.flash(this.enemies.get(ev.id))
      else if (ev.type === "enemyDied") this.fadeOut(this.enemies, ev.id)
    }
  }

  private hpBar(img: GameObjects.Image, e: Enemy): void {
    const max = ENEMIES[e.kind].hp
    if (e.hp >= max) return
    const x = img.x - HP_W / 2
    const y = img.y - HP_Y
    this.bars.fillStyle(0x00_00_00, 0.6).fillRect(x - 1, y - 1, HP_W + 2, HP_H + 2)
    this.bars.fillStyle(0xe0_3c_31).fillRect(x, y, (HP_W * Math.max(0, e.hp)) / max, HP_H)
  }

  private pulse(img: GameObjects.Image | undefined): void {
    if (img) this.scene.tweens.add({ targets: img, scaleY: 0.75, duration: THROW_MS, yoyo: true })
  }

  private flash(img: GameObjects.Image | undefined): void {
    if (!img) return
    img.setTint(HIT_TINT)
    this.scene.time.delayedCall(HIT_MS, () => img.active && img.clearTint())
  }

  /** Detach a dead enemy's sprite and let it fade instead of vanishing. */
  private fadeOut(sprites: Map<number, GameObjects.Image>, id: number): void {
    const img = sprites.get(id)
    if (!img) return
    sprites.delete(id)
    img.setTint(HIT_TINT)
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      angle: 90,
      duration: DEATH_MS,
      onComplete: () => img.destroy(),
    })
  }

  destroy(): void {
    for (const m of [this.enemies, this.throwers, this.rocks]) sync(m, [], () => undefined as never)
    this.bars.destroy()
  }
}

/** Create sprites for new items, update existing ones, destroy those whose item is gone. */
function sync<T extends { id: number }>(
  sprites: Map<number, GameObjects.Image>,
  items: T[],
  create: (item: T) => GameObjects.Image,
  update?: (img: GameObjects.Image, item: T) => void,
): void {
  const alive = new Set<number>()
  for (const item of items) {
    alive.add(item.id)
    let img = sprites.get(item.id)
    if (!img) {
      img = create(item)
      sprites.set(item.id, img)
    }
    update?.(img, item)
  }
  for (const [id, img] of sprites) {
    if (alive.has(id)) continue
    img.destroy()
    sprites.delete(id)
  }
}
