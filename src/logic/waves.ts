import { REPUTATION, WAVES } from "./balance.ts"
import type { EnemyKind, WaveSpec } from "./types.ts"

export const waveSpec = (stage: number): WaveSpec =>
  WAVES[Math.min(stage, WAVES.length) - 1] ?? { enemies: {}, interval: 1 }

export interface Spawn {
  tick: number
  kind: EnemyKind
}

/** Spawn schedule of a stage's wave, in tick order; Reputation makes it bigger. */
export function spawnSchedule(stage: number, reputation = 0): Spawn[] {
  const spec = waveSpec(stage)
  const grow = 1 + REPUTATION.enemyGrowth * reputation
  const kinds = (Object.entries(spec.enemies) as [EnemyKind, number][]).flatMap(([kind, n]) =>
    Array.from({ length: Math.round(n * grow) }, () => kind),
  )
  return kinds.map((kind, i) => ({ tick: i * spec.interval, kind }))
}
