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

it("build bar places a rock pile next to the hut", async ({ page }, info) => {
  await page.goto("")
  const canvas = page.locator("#game-container canvas")
  await expect(canvas).toBeVisible()
  await frames(page)
  const { width, height } = page.viewportSize() ?? { width: 0, height: 0 }
  // map view sits between HUD (36 px) and bar (64 px); start zoom covers the 32×24 map of
  // 32 px tiles; the 2×2 hut's center = view center (a tile corner)
  const viewH = height - 36 - 64
  const tile = 32 * Math.max(width / 1024, viewH / 768)
  const hud = { x: 0, y: 0, width, height: 36 }
  // 4 bar buttons (woodcutter, quarry, rock pile, Defend!), width min(120, (W - 5*6) / 4), gap 6
  const w = Math.min(120, (width - 30) / 4)
  const x0 = (width - (4 * w + 18)) / 2
  const button = (i: number) => x0 + i * (w + 6) + w / 2
  const hudBefore = await page.screenshot({ clip: hud })
  await page.mouse.click(button(2), height - 32)
  await page.mouse.click(width / 2 + 2.5 * tile, 36 + viewH / 2 - 0.5 * tile)
  await frames(page)
  expect((await page.screenshot({ clip: hud })).equals(hudBefore)).toBe(false)
  await page.mouse.click(width / 2 - 2.5 * tile, 36 + viewH / 2 + 0.5 * tile)
  await page.screenshot({ path: `tmp/screens/build-${info.project.name}.png` })

  const hudBuild = await page.screenshot({ clip: hud })
  await page.mouse.click(button(3), height - 32)
  await new Promise((r) => setTimeout(r, 6000))
  expect((await page.screenshot({ clip: hud })).equals(hudBuild)).toBe(false)
  await page.screenshot({ path: `tmp/screens/defend-${info.project.name}.png` })
})
