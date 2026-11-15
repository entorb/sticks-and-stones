import { expect, test as it } from "@playwright/test"

it("game loads without console errors", async ({ page }, info) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(String(e)))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  await page.goto("")
  await expect(page.locator("#game-container canvas")).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `tmp/screens/smoke-${info.project.name}.png` })
  expect(errors).toEqual([])
})
