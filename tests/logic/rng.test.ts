import { describe, expect, it } from "vitest"
import { createRng } from "../../src/logic/rng.ts"

const take = (seed: number, n: number) => {
  const rng = createRng(seed)
  return Array.from({ length: n }, rng)
}

describe("createRng", () => {
  it("same seed gives same sequence", () => {
    expect(take(42, 5)).toEqual(take(42, 5))
  })

  it("different seeds differ", () => {
    expect(take(1, 5)).not.toEqual(take(2, 5))
  })

  it("stays in [0, 1)", () => {
    for (const x of take(7, 1000)) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})
