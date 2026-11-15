import { BUILDINGS } from "./balance.ts"
import type { GameState, Resources } from "./types.ts"

/** What fully staffed work buildings produce per stage. */
export function production(s: GameState): Resources {
  const out = { wood: 0, stone: 0 }
  for (const b of s.buildings) {
    const spec = BUILDINGS[b.type]
    if (spec.workers === 0 || b.workers < spec.workers) continue
    out.wood += spec.produces.wood
    out.stone += spec.produces.stone
  }
  return out
}

/** Add one stage of production to the stockpile; returns the gain. */
export function payout(s: GameState): Resources {
  const gain = production(s)
  s.res.wood += gain.wood
  s.res.stone += gain.stone
  return gain
}
