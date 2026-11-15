import { expect, test as it, type Page } from "@playwright/test"

/** Wait until the browser has rendered two more frames. */
const frames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

it("game loads without console errors", async ({ page }, info) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(String(e)))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  await page.goto("")
  await expect(page.locator("#game-container canvas")).toBeVisible()
  await frames(page)
  await page.screenshot({ path: `tmp/screens/smoke-${info.project.name}.png` })
  expect(errors).toEqual([])
})

it("drag pans and wheel zooms the map", async ({ page }) => {
  await page.goto("")
  const canvas = page.locator("#game-container canvas")
  await expect(canvas).toBeVisible()
  await frames(page)
  const before = await canvas.screenshot()
  await page.mouse.move(200, 200)
  await page.mouse.down()
  await page.mouse.move(100, 120, { steps: 5 })
  await page.mouse.up()
  await frames(page)
  const panned = await canvas.screenshot()
  expect(panned.equals(before)).toBe(false)
  await page.mouse.wheel(0, -300)
  await frames(page)
  expect((await canvas.screenshot()).equals(panned)).toBe(false)
})

it("build bar places a rock pile next to the keep", async ({ page }, info) => {
  await page.goto("")
  const canvas = page.locator("#game-container canvas")
  await expect(canvas).toBeVisible()
  await frames(page)
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 }
  // map view sits between HUD (36 px) and bar (64 px); start zoom covers the 32×24 map of
  // 32 px tiles; keep center = view center
  const viewH = height - 36 - 64
  const tile = 32 * Math.max(width / 1024, viewH / 768)
  const hud = { x: 0, y: 0, width, height: 36 }
  const hudBefore = await page.screenshot({ clip: hud })
  await page.mouse.click(width / 2, height - 32) // rock pile = middle of 5 buttons
  await page.mouse.click(width / 2 + 2.5 * tile, 36 + viewH / 2)
  await frames(page)
  expect((await page.screenshot({ clip: hud })).equals(hudBefore)).toBe(false)
  await page.screenshot({ path: `tmp/screens/build-${info.project.name}.png` })
})
