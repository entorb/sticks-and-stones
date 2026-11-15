import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tmp/test-results",
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173/sticks-and-stones/",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 667 } } },
  ],
  webServer: {
    command: "pnpm build && pnpm preview",
    url: "http://localhost:4173/sticks-and-stones/",
    reuseExistingServer: true,
  },
})
