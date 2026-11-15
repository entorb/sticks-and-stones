import type { Profile } from "../logic/types.ts"

const KEY = "sticks-and-stones.profile"
const VERSION = 1

/** The mayor's saved profile, or a fresh one (no or broken save, storage blocked). */
export function loadProfile(): Profile {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? "null") as (Profile & { v: number }) | null
    if (d?.v === VERSION) return { renown: d.renown, checkpoint: d.checkpoint }
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
