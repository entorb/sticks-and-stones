import type { Input, Scene } from "phaser"

const MAX_ZOOM = 3
const WHEEL_STEP = 1.1

const pinchDist = (a: Input.Pointer, b: Input.Pointer) => Math.hypot(a.x - b.x, a.y - b.y)

/** Max pointer travel (screen px) for a press to count as a tap, not a drag. */
const TAP_SLOP = 10

interface Opts {
  world: { width: number; height: number }
  focus: { x: number; y: number }
  /** Screen px kept free for UI above and below the map view. */
  insets: { top: number; bottom: number }
  /** Tap (no drag, no pinch) at a world position. */
  onTap: (worldX: number, worldY: number) => void
}

/** Drag to pan, pinch / mouse wheel to zoom, tap callback. */
export function addCameraControls(scene: Scene, { world, focus, insets, onTap }: Opts): void {
  const { width: worldW, height: worldH } = world
  const cam = scene.cameras.main
  const fitViewport = (w: number, h: number) =>
    cam.setViewport(0, insets.top, w, Math.max(1, h - insets.top - insets.bottom))
  fitViewport(scene.scale.width, scene.scale.height)
  cam.setBounds(0, 0, worldW, worldH)
  const fitZoom = () => Math.min(cam.width / worldW, cam.height / worldH)
  const coverZoom = () => Math.max(cam.width / worldW, cam.height / worldH)
  /** Zoom to `zoom` while keeping the world point under screen (sx, sy) in place. */
  const zoomAt = (zoom: number, sx: number, sy: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(fitZoom(), zoom))
    const hw = cam.width / 2
    const hh = cam.height / 2
    // Phaser camera (origin 0.5): world = scroll + half + (screen - half) / zoom
    const vx = sx - cam.x
    const vy = sy - cam.y
    const wx = cam.scrollX + hw + (vx - hw) / cam.zoom
    const wy = cam.scrollY + hh + (vy - hh) / cam.zoom
    cam.setZoom(z)
    cam.setScroll(wx - hw - (vx - hw) / z, wy - hh - (vy - hh) / z)
  }
  cam.setZoom(Math.min(MAX_ZOOM, coverZoom()))
  cam.centerOn(focus.x, focus.y)

  let pinch = 0
  let dragged = false
  scene.input.on("pointerdown", () => {
    dragged = scene.input.pointer1.isDown && scene.input.pointer2.isDown
  })
  scene.input.on("pointermove", (p: Input.Pointer) => {
    const { pointer1: a, pointer2: b } = scene.input
    if (a.isDown && b.isDown) {
      dragged = true
      const d = pinchDist(a, b)
      if (pinch > 0) zoomAt((cam.zoom * d) / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2)
      pinch = d
      return
    }
    pinch = 0
    if (!p.isDown) return
    if (p.getDistance() > TAP_SLOP) dragged = true
    cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom
    cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom
  })
  scene.input.on("pointerup", (p: Input.Pointer) => {
    pinch = 0
    if (dragged || p.getDistance() > TAP_SLOP) return
    const w = cam.getWorldPoint(p.x, p.y)
    onTap(w.x, w.y)
  })
  scene.input.on("wheel", (p: Input.Pointer, _over: unknown, _dx: number, dy: number) => {
    zoomAt(cam.zoom * WHEEL_STEP ** (-dy / 100), p.x, p.y)
  })
  scene.scale.on("resize", (size: { width: number; height: number }) => {
    fitViewport(size.width, size.height)
    zoomAt(cam.zoom, cam.x + cam.width / 2, cam.y + cam.height / 2)
  })
}
