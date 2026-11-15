import type { Input, Scene } from "phaser"

const MAX_ZOOM = 3
const WHEEL_STEP = 1.1

const pinchDist = (a: Input.Pointer, b: Input.Pointer) => Math.hypot(a.x - b.x, a.y - b.y)

/** Drag to pan, pinch / mouse wheel to zoom. World = (0, 0, worldW, worldH). */
export function addCameraControls(
  scene: Scene,
  worldW: number,
  worldH: number,
  focus: { x: number; y: number },
): void {
  const cam = scene.cameras.main
  cam.setBounds(0, 0, worldW, worldH)
  const fitZoom = () => Math.min(cam.width / worldW, cam.height / worldH)
  const coverZoom = () => Math.max(cam.width / worldW, cam.height / worldH)
  /** Zoom to `zoom` while keeping the world point under screen (sx, sy) in place. */
  const zoomAt = (zoom: number, sx: number, sy: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(fitZoom(), zoom))
    const hw = cam.width / 2
    const hh = cam.height / 2
    // Phaser camera (origin 0.5): world = scroll + half + (screen - half) / zoom
    const wx = cam.scrollX + hw + (sx - hw) / cam.zoom
    const wy = cam.scrollY + hh + (sy - hh) / cam.zoom
    cam.setZoom(z)
    cam.setScroll(wx - hw - (sx - hw) / z, wy - hh - (sy - hh) / z)
  }
  cam.setZoom(Math.min(MAX_ZOOM, coverZoom()))
  cam.centerOn(focus.x, focus.y)

  let pinch = 0
  scene.input.on("pointermove", (p: Input.Pointer) => {
    const { pointer1: a, pointer2: b } = scene.input
    if (a.isDown && b.isDown) {
      const d = pinchDist(a, b)
      if (pinch > 0) zoomAt((cam.zoom * d) / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2)
      pinch = d
      return
    }
    pinch = 0
    if (!p.isDown) return
    cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom
    cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom
  })
  scene.input.on("pointerup", () => {
    pinch = 0
  })
  scene.input.on("wheel", (p: Input.Pointer, _over: unknown, _dx: number, dy: number) => {
    zoomAt(cam.zoom * WHEEL_STEP ** (-dy / 100), p.x, p.y)
  })
  scene.scale.on("resize", (size: { width: number; height: number }) => {
    cam.setSize(size.width, size.height)
    zoomAt(cam.zoom, cam.width / 2, cam.height / 2)
  })
}
