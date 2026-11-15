import type { GameObjects, Scene } from "phaser"
import { BUILDINGS } from "../logic/balance.ts"
import { tileAt } from "../logic/map.ts"
import type { Building, GameState, Point } from "../logic/types.ts"
import { TOOL_HAND } from "./battleView.ts"
import { PEASANT_KEY, TILE_PX, TOOL_GRIP, TOOL_KEY } from "./textures.ts"

/** A worker stands this far (tiles) from its building toward the tree / rock. */
const WORKER_OUT = 0.55
const WORKER_SCALE = 0.7
const CHOP_MS = 350
/** The 8 neighbor offsets, straight ones first. */
const NEIGHBORS: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },
]

/** Build phase: a work building's worker swinging its tool at a neighboring tree / rock
 * (empty if the building has no tool). The tool tween repeats until the images are destroyed. */
export function choppingWorker(scene: Scene, s: GameState, b: Building): GameObjects.Image[] {
  const { near } = BUILDINGS[b.type]
  const key = TOOL_KEY[b.type]
  const d = NEIGHBORS.find((n) => tileAt(s.map, b.x + n.x, b.y + n.y) === near)
  if (!(d && key)) return []
  const x = (b.x + 0.5 + d.x * WORKER_OUT) * TILE_PX
  const y = (b.y + 0.5 + d.y * WORKER_OUT) * TILE_PX
  const side = d.x < 0 ? -1 : 1
  const worker = scene.add.image(x, y, PEASANT_KEY).setScale(WORKER_SCALE)
  const tool = scene.add
    .image(x + side * TOOL_HAND.dx * WORKER_SCALE, y + TOOL_HAND.dy * WORKER_SCALE, key)
    .setOrigin(TOOL_GRIP.x, TOOL_GRIP.y)
    .setScale(TOOL_HAND.scale * WORKER_SCALE)
    .setFlipX(side < 0)
    .setAngle(side * TOOL_HAND.rest)
  scene.tweens.add({
    targets: tool,
    angle: side * (TOOL_HAND.rest + TOOL_HAND.swing),
    duration: CHOP_MS,
    ease: "Cubic.easeIn",
    yoyo: true,
    repeat: -1,
  })
  return [worker, tool]
}
