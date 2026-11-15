import { deserialize, serialize } from "../logic/save.ts"
import type { GameState, Profile } from "../logic/types.ts"

const KEY = "sticks-and-stones.profile"
const VERSION = 1

/** The mayor's saved profile, or a fresh one (no or broken save, storage blocked). */
export function loadProfile(): Profile {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? "null") as (Profile & { v: number }) | null
    if (d?.v === VERSION)
      return { renown: d.renown, checkpoint: d.checkpoint, pileLevel: d.pileLevel }
  } catch {
    // fall through to a fresh profile
  }
  return { renown: 0, checkpoint: 1 }
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...p }))
  } catch {
    // storage blocked (private mode): progress lives until reload
  }
}

const VILLAGE_KEY = "sticks-and-stones.village"

/** The autosaved village (build phase), or null. */
export function loadVillage(): GameState | null {
  try {
    const raw = localStorage.getItem(VILLAGE_KEY)
    return raw === null ? null : deserialize(raw)
  } catch {
    return null
  }
}

/** Autosave the village; null clears it (lost village). */
export function saveVillage(s: GameState | null): void {
  try {
    if (s) localStorage.setItem(VILLAGE_KEY, serialize(s))
    else localStorage.removeItem(VILLAGE_KEY)
  } catch {
    // storage blocked: see saveProfile
  }
}
