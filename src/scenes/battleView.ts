import type { GameObjects, Scene } from "phaser"
import { ENEMIES, MAYOR, PEASANT } from "../logic/balance.ts"
import type { Battle, Unit } from "../logic/battle.ts"
import { enemyKey, MAYOR_KEY, PEASANT_KEY, ROCK_KEY, TILE_PX } from "./textures.ts"

/** The mayor is drawn in front of the hut door, below the hut center (px). */
const MAYOR_AT_DOOR = 26
/** Units stand a bit above their tile center so the building below stays visible (px). */
const LIFT = 8
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
const HP_ENEMY = 0xe0_3c_31
const HP_FRIEND = 0x5a_c8_5a

interface Look {
  key: string
  max: number
  color: number
  /** Sprite offset (px). */
  dx: number
  dy: number
}

const px = (tile: number) => (tile + 0.5) * TILE_PX
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Sprites for one battle: enemies, peasants, the mayor (interpolated, HP bars), flying rocks. */
export class BattleView {
  private readonly scene: Scene
  /** Unit sprites by unit id (enemies, peasants, mayor). */
  private readonly units = new Map<number, GameObjects.Image>()
  private readonly rocks = new Map<number, GameObjects.Image>()
  private readonly bars: GameObjects.Graphics

  constructor(scene: Scene) {
    this.scene = scene
    this.bars = scene.add.graphics().setDepth(4)
  }

  /** Sync sprites with the battle; `alpha` = progress (0..1) toward the next tick. */
  render(b: Battle, alpha: number): void {
    this.bars.clear()
    const looks = new Map<number, Look>()
    for (const e of b.enemies)
      looks.set(e.id, {
        key: enemyKey(e.kind),
        max: ENEMIES[e.kind].hp,
        color: HP_ENEMY,
        dx: 0,
        dy: 0,
      })
    for (const p of b.peasants)
      looks.set(p.id, { key: PEASANT_KEY, max: PEASANT.hp, color: HP_FRIEND, dx: 0, dy: 0 })
    looks.set(b.mayor.id, {
      key: MAYOR_KEY,
      max: MAYOR.hp,
      color: HP_FRIEND,
      dx: 0,
      dy: MAYOR_AT_DOOR,
    })
    const units: Unit[] = [...b.enemies, ...b.peasants, b.mayor]
    sync(
      this.units,
      units,
      (u) => this.scene.add.image(0, 0, looks.get(u.id)?.key ?? PEASANT_KEY).setDepth(2),
      (img, u) => {
        const look = looks.get(u.id)
        img.setPosition(
          px(lerp(u.px, u.x, alpha)) + (look?.dx ?? 0),
          px(lerp(u.py, u.y, alpha)) - LIFT + (look?.dy ?? 0),
        )
        if (look) this.hpBar(img, u.hp, look.max, look.color)
      },
    )
    sync(
      this.rocks,
      b.rocks,
      () => this.scene.add.image(0, 0, ROCK_KEY).setDepth(3).setScale(ROCK_SCALE),
      (img, r) => {
        const t = Math.min(1, (r.total - r.ticks + alpha) / r.total)
        const arc = Math.sin(t * Math.PI) * ARC_PX
        img.setPosition(px(lerp(r.from.x, r.to.x, t)), px(lerp(r.from.y, r.to.y, t)) - LIFT - arc)
      },
    )
  }

  /** Animate this tick's events (call before `render`, which removes dead sprites). */
  events(b: Battle): void {
    for (const ev of b.events) {
      const img = ev.type === "wall" ? undefined : this.units.get(ev.id)
      if (!img) continue
      if (ev.type === "throw")
        this.scene.tweens.add({ targets: img, scaleY: 0.75, duration: THROW_MS, yoyo: true })
      else if (ev.type === "hit") this.flash(img)
      else this.fadeOut(ev.id, img)
    }
  }

  private hpBar(img: GameObjects.Image, hp: number, max: number, color: number): void {
    if (hp >= max) return
    const x = img.x - HP_W / 2
    const y = img.y - HP_Y
    this.bars.fillStyle(0x00_00_00, 0.6).fillRect(x - 1, y - 1, HP_W + 2, HP_H + 2)
    this.bars.fillStyle(color).fillRect(x, y, (HP_W * Math.max(0, hp)) / max, HP_H)
  }

  private flash(img: GameObjects.Image): void {
    img.setTint(HIT_TINT)
    this.scene.time.delayedCall(HIT_MS, () => img.active && img.clearTint())
  }

  /** Detach a dead unit's sprite and let it fade instead of vanishing. */
  private fadeOut(id: number, img: GameObjects.Image): void {
    this.units.delete(id)
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
    sync(this.units, [], () => undefined as never)
    sync(this.rocks, [], () => undefined as never)
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
