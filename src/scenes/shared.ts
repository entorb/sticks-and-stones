import type { BuildingType } from "../logic/types.ts"

/** Selected build-bar tool; null = tap a building to toggle its workers. */
export type Tool = BuildingType | "sell" | null

/** Registry keys shared by GameScene and UIScene. */
export const REG = { state: "state", tool: "tool", battle: "battle" } as const

/** game.events names. */
export const EV = { changed: "state-changed", toast: "toast", defend: "defend" } as const

/** UI bar heights (screen px); the map camera fits between them. */
export const HUD_H = 36
export const BAR_H = 64
