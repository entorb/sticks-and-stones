import { CHECKPOINTS, PILE_ADVANCE, RENOWN } from "./balance.ts"
import { rockCapacity } from "./building.ts"
import { payout } from "./economy.ts"
import type { GameState, Profile, Resources } from "./types.ts"

/** Advance to the next stage; its build phase starts with the production payout and full piles. */
export function nextStage(s: GameState): Resources {
  s.stage += 1
  for (const b of s.buildings) b.rocks = rockCapacity(s, b.type)
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

/** Renown price of the next rock pile advance level; undefined = all bought. */
export const pileAdvanceCost = (p: Profile): number | undefined =>
  PILE_ADVANCE.renown[p.pileLevel ?? 0]

/** Buy the next rock pile advance level with Renown; false = maxed or too little Renown. */
export function buyPileAdvance(p: Profile): boolean {
  const cost = pileAdvanceCost(p)
  if (cost === undefined || p.renown < cost) return false
  p.renown -= cost
  p.pileLevel = (p.pileLevel ?? 0) + 1
  return true
}
