import { WAVES } from "./balance.ts"
import { createRng } from "./rng.ts"
import { buildingAt } from "./state.ts"
import type { EnemyKind, GameState, Point, WaveSpec } from "./types.ts"

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

/** Random spawn of this stage's wave (fixed per seed and stage); the next free candidate if a
 * building stands on it. */
export function waveSpawn(s: GameState): Point | undefined {
  const { spawns } = s.map
  const start = Math.floor(createRng(s.seed * 1009 + s.stage)() * spawns.length)
  for (let i = 0; i < spawns.length; i++) {
    const p = spawns[(start + i) % spawns.length]
    if (p && !buildingAt(s, p.x, p.y)) return p
  }
  return undefined
}
