import { describe, expect, it } from "vitest"
import { WAVES } from "../../src/logic/balance.ts"
import { spawnSchedule, waveSpec } from "../../src/logic/waves.ts"

describe("waves", () => {
  it("stage 1 spawns its raiders at the interval", () => {
    const s = spawnSchedule(1)
    expect(s).toHaveLength(WAVES[0]?.enemies.raider ?? 0)
    expect(s[1]?.tick).toBe(WAVES[0]?.interval)
  })

  it("stages past the table repeat the last wave", () => {
    expect(waveSpec(99)).toEqual(WAVES[WAVES.length - 1])
  })
})
