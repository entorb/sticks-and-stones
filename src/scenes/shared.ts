import type { BuildingType } from "../logic/types.ts"

/** Selected build-bar tool; null = tap a building to toggle its workers. */
export type Tool = BuildingType | null

/** Registry keys shared by GameScene and UIScene. */
export const REG = {
  state: "state",
  tool: "tool",
  battle: "battle",
  profile: "profile",
  /** Battle tick multiplier (1, 2 or 4), toggled in the build bar during a battle. */
  speed: "speed",
  /** Actual build bar height (px): grows with extra button rows on narrow screens. */
  barH: "barH",
} as const

/** game.events names. */
export const EV = { changed: "state-changed", toast: "toast", defend: "defend" } as const

/** UI bar heights (screen px); the map camera fits between them. */
export const HUD_H = 36
export const BAR_H = 64

/** UI look shared by the HUD, build bar and menu. */
export const FONT = "sans-serif"
export const PANEL = 0x1e_16_0e
export const BTN = 0x4a_38_26
export const TEXT = "#f4e9c8"
