import { payout } from "./economy.ts"
import type { GameState, Resources } from "./types.ts"

/** Advance to the next stage; its build phase starts with the production payout. */
export function nextStage(s: GameState): Resources {
  s.stage += 1
  return payout(s)
}
