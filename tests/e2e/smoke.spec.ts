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
