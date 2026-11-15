// Export a PNG and a text snapshot of every screen, for UI review (desktop + mobile).
//
//   pnpm dev   # then:
//   node scripts/gen_screen_exports.mjs [--url=...] [--screen=shop] [--device=mobile]
//
// Writes tmp/screens/<device>-<NN>-<name>.png + .txt. The .txt lists every visible text
// (design x/y, CSS font px, color) and every enabled pointer target (CSS px size, flagged
// `SMALL` below 44 px on touch). Coords = canvas px (Scale.RESIZE).
import { mkdirSync, writeFileSync } from "node:fs"
import process from "node:process"
import { chromium } from "@playwright/test"

const args = process.argv.slice(2)
const arg = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3)
const URL = arg("url") ?? "http://localhost:5173/sticks-and-stones/"
const OUT = "tmp/screens"
const DEVICES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  mobile: {
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
}

/** In-page: text + hit targets of all active scenes (recurses containers). */
function snapshot() {
  const g = globalThis.__game
  const k = g.scale.displaySize.width / g.scale.width
  const lines = []
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: shortcut: existing complex logic, refactor when touched next
  const walk = (o, scene) => {
    if (!o.visible || o.alpha === 0) return
    if (o.list) for (const c of o.list) walk(c, scene)
    const b = o.getBounds?.()
    if (o.type === "Text" && o.text.trim()) {
      const fs = Number.parseFloat(o.style.fontSize) * (o.scaleY ?? 1)
      const px = (fs * k).toFixed(1)
      lines.push(
        `T ${scene} (${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}) ${px}px${fs * k < 12 ? " TINY" : ""} ${o.style.color} ${JSON.stringify(o.text)}`,
      )
    }
    if (o.input?.enabled && b) {
      const w = b.width * k
      const h = b.height * k
      const small = Math.min(w, h) < 44 ? " SMALL" : ""
      lines.push(
        `H ${scene} (${Math.round(b.x)},${Math.round(b.y)}) ${Math.round(w)}x${Math.round(h)}css${small}`,
      )
    }
  }
  for (const s of g.scene.getScenes(true)) for (const o of s.children.list) walk(o, s.scene.key)
  return `scale ${k.toFixed(2)} css/design\n${lines.join("\n")}\n`
}

// [name, async (page) => {...}] steps, run in order on one page; add one per new screen
const SCREENS = [
  ["menu", async () => undefined],
  [
    "game",
    (page) => page.evaluate(() => globalThis.__game.scene.getScene("Menu").scene.start("Game", {})),
  ],
]

const only = arg("screen")
const devices = arg("device") ? [arg("device")] : Object.keys(DEVICES)
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
})
let failed = false
// screens share one page and must run in order: chain them instead of awaiting in a loop
const inOrder = (items, fn) =>
  items.reduce((p, item, i) => p.then(() => fn(item, i)), Promise.resolve())
await inOrder(devices, async (dev) => {
  const ctx = await browser.newContext(DEVICES[dev])
  const page = await ctx.newPage()
  page.on("pageerror", (e) => {
    failed = true
    console.error(`${dev}: ${e}`)
  })
  await page.goto(URL, { waitUntil: "load" })
  await page.waitForFunction(() => globalThis.__game?.scene.isActive("Game"), undefined, {
    timeout: 20_000,
  })
  await page.waitForTimeout(800)
  await inOrder(SCREENS, async ([name, go], i) => {
    await go(page)
    await page.waitForTimeout(500)
    if (only && only !== name) return
    const file = `${OUT}/${dev}-${String(i + 1).padStart(2, "0")}-${name}`
    await page.screenshot({ path: `${file}.png` })
    writeFileSync(`${file}.txt`, `# ${dev} ${name}\n${await page.evaluate(snapshot)}`)
    console.log(file)
  })
  await ctx.close()
})
await browser.close()
if (failed) process.exit(1)
