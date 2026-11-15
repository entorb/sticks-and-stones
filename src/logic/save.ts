// Village save format: versioned JSON of the build-phase GameState.

import { spawnCandidates } from "./map.ts"
import type { GameState } from "./types.ts"

export const SAVE_VERSION = 2

/** MIGRATIONS[v] turns a version v save into version v + 1 (add one per format change). */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 maps had one fixed spawn; v2 picks a random edge tile per stage from all candidates
  1: (d) => {
    const s = d.state as GameState
    return { ...d, state: { ...s, map: { ...s.map, spawns: spawnCandidates(s.map) } } }
  },
}

export const serialize = (s: GameState): string => JSON.stringify({ v: SAVE_VERSION, state: s })

/** Saved state migrated to the current version, or null (broken, unknown or newer version). */
export function deserialize(raw: string): GameState | null {
  try {
    let d = JSON.parse(raw) as { v?: unknown; state?: unknown }
    while (typeof d.v === "number" && d.v < SAVE_VERSION) {
      const step = MIGRATIONS[d.v]
      if (!step) return null
      d = { ...step(d), v: d.v + 1 }
    }
    const s = d.state as GameState | undefined
    // trust boundary: storage may hold anything
    const ok = d.v === SAVE_VERSION && Array.isArray(s?.buildings) && Array.isArray(s.map.tiles)
    return ok ? s : null
  } catch {
    return null
  }
}
