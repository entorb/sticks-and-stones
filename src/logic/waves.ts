import { WAVES } from "./balance.ts"
import type { EnemyKind, WaveSpec } from "./types.ts"

export const waveSpec = (stage: number): WaveSpec =>
  WAVES[Math.min(stage, WAVES.length) - 1] ?? { enemies: {}, interval: 1 }

export interface Spawn {
  tick: number
  kind: EnemyKind
}

/** Spawn schedule of a stage's wave, in tick order. */
export function spawnSchedule(stage: number): Spawn[] {
  const spec = waveSpec(stage)
  const kinds = (Object.entries(spec.enemies) as [EnemyKind, number][]).flatMap(([kind, n]) =>
    Array.from({ length: n }, () => kind),
  )
  return kinds.map((kind, i) => ({ tick: i * spec.interval, kind }))
}
