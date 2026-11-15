import { describe, expect, it } from "vitest"
import { CHECKPOINTS } from "../../src/logic/balance.ts"
import { placeBuilding, toggleWorkers } from "../../src/logic/building.ts"
import { payout, production } from "../../src/logic/economy.ts"
import { nextStage } from "../../src/logic/progression.ts"
import { stateFrom } from "./helpers.ts"

const ROWS = ["......F", "......F", "......W", "R......"]
const START = CHECKPOINTS[0]

describe("payout", () => {
  it("pays staffed woodcutter and quarry once", () => {
    const s = stateFrom(ROWS)
    placeBuilding(s, "woodcutter", 5, 0)
    placeBuilding(s, "quarry", 1, 2)
    placeBuilding(s, "rockPile", 3, 3)
    const before = { ...s.res }
    expect(payout(s)).toEqual({ wood: 15, stone: 10 })
    expect(s.res).toEqual({ wood: before.wood + 15, stone: before.stone + 10 })
  })

  it("unstaffed buildings produce nothing", () => {
    const s = stateFrom(ROWS)
    placeBuilding(s, "woodcutter", 5, 0)
    toggleWorkers(s, 1)
    expect(production(s)).toEqual({ wood: 0, stone: 0 })
  })
})

describe("nextStage", () => {
  it("advances the stage and pays out", () => {
    const s = stateFrom(ROWS)
    placeBuilding(s, "woodcutter", 5, 0)
    expect(nextStage(s)).toEqual({ wood: 15, stone: 0 })
    expect(s.stage).toBe(2)
    expect(s.res.wood).toBe(START.wood - 10 + 15)
  })
})
