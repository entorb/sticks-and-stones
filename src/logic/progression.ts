import { BUILDINGS, CHECKPOINTS, RENOWN } from "./balance.ts"
import { payout } from "./economy.ts"
import type { GameState, Profile, Resources } from "./types.ts"

/** Advance to the next stage; its build phase starts with the production payout and full piles. */
export function nextStage(s: GameState): Resources {
  s.stage += 1
  for (const b of s.buildings) b.rocks = BUILDINGS[b.type].rocks
  return payout(s)
}

/** Renown for winning stage `won` and arriving at stage `reached` (checkpoint bonus once). */
export function earnRenown(p: Profile, won: number, reached: number): number {
  let gain = won * RENOWN.perStage
  if (CHECKPOINTS.some((c) => c.stage === reached) && reached > p.checkpoint) {
    p.checkpoint = reached
    gain += RENOWN.checkpoint
  }
  p.renown += gain
  return gain
}
