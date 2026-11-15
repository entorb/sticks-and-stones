import { describe, expect, it } from "vitest"
import { BUILDINGS, START } from "../../src/logic/balance.ts"
import { placeBuilding, placeError, sellBuilding, toggleWorkers } from "../../src/logic/building.ts"
import { idlePeasants } from "../../src/logic/state.ts"
import { stateFrom } from "./helpers.ts"

// keep at (0,0)-(1,1)
const ROWS = ["......F", "......F", "......W", "R......"]

describe("placeError", () => {
  it("allows a woodcutter on grass next to forest", () => {
    expect(placeError(stateFrom(ROWS), "woodcutter", 5, 0)).toBeNull()
    expect(placeError(stateFrom(ROWS), "woodcutter", 5, 2)).toBeNull() // diagonal counts
  })

  it("rejects non-grass tiles", () => {
    const s = stateFrom(ROWS)
    expect(placeError(s, "rockPile", 6, 0)).toBe("terrain")
    expect(placeError(s, "rockPile", 6, 2)).toBe("terrain")
    expect(placeError(s, "rockPile", 0, 3)).toBe("terrain")
    expect(placeError(s, "rockPile", -1, 0)).toBe("terrain")
  })

  it("rejects the keep and occupied tiles", () => {
    const s = stateFrom(ROWS)
    expect(placeError(s, "rockPile", 1, 1)).toBe("occupied")
    placeBuilding(s, "rockPile", 3, 3)
    expect(placeError(s, "rockPile", 3, 3)).toBe("occupied")
  })

  it("needs forest for woodcutter and rock for quarry", () => {
    const s = stateFrom(ROWS)
    expect(placeError(s, "woodcutter", 3, 0)).toBe("notNear")
    expect(placeError(s, "quarry", 5, 0)).toBe("notNear")
    expect(placeError(s, "quarry", 1, 2)).toBeNull()
  })

  it("rejects when resources are short", () => {
    const s = stateFrom(ROWS)
    s.res.stone = BUILDINGS.rockPile.cost.stone - 1
    expect(placeError(s, "rockPile", 3, 3)).toBe("cost")
  })

  it("rejects locked buildings", () => {
    const s = stateFrom(ROWS)
    s.stage = 0
    expect(placeError(s, "rockPile", 3, 3)).toBe("locked")
  })
})

describe("placeBuilding", () => {
  it("pays the cost and staffs from idle peasants", () => {
    const s = stateFrom(ROWS)
    expect(placeBuilding(s, "woodcutter", 5, 0)).toBeNull()
    expect(s.res.wood).toBe(START.wood - BUILDINGS.woodcutter.cost.wood)
    expect(s.buildings[0]).toMatchObject({ type: "woodcutter", x: 5, y: 0, workers: 1 })
    expect(idlePeasants(s)).toBe(START.peasants - 1)
  })

  it("leaves the building unstaffed when nobody is idle", () => {
    const s = stateFrom(ROWS)
    s.peasants = 0
    placeBuilding(s, "woodcutter", 5, 0)
    expect(s.buildings[0]?.workers).toBe(0)
  })

  it("changes nothing on error", () => {
    const s = stateFrom(ROWS)
    expect(placeBuilding(s, "woodcutter", 3, 0)).toBe("notNear")
    expect(s.buildings).toEqual([])
    expect(s.res.wood).toBe(START.wood)
  })
})

describe("sellBuilding", () => {
  it("refunds half the cost (rounded down) and frees workers", () => {
    const s = stateFrom(ROWS)
    placeBuilding(s, "quarry", 1, 2)
    expect(sellBuilding(s, 1)).toBe(true)
    expect(s.res.wood).toBe(START.wood - 15 + 7)
    expect(s.buildings).toEqual([])
    expect(idlePeasants(s)).toBe(START.peasants)
    expect(sellBuilding(s, 1)).toBe(false)
  })
})

describe("toggleWorkers", () => {
  it("unstaffs and restaffs a work building", () => {
    const s = stateFrom(ROWS)
    placeBuilding(s, "woodcutter", 5, 0)
    expect(toggleWorkers(s, 1)).toBe(true)
    expect(s.buildings[0]?.workers).toBe(0)
    expect(toggleWorkers(s, 1)).toBe(true)
    expect(s.buildings[0]?.workers).toBe(1)
  })

  it("can't staff without idle peasants or on non-work buildings", () => {
    const s = stateFrom(ROWS)
    placeBuilding(s, "woodcutter", 5, 0)
    placeBuilding(s, "rockPile", 3, 3)
    toggleWorkers(s, 1)
    s.peasants = 0
    expect(toggleWorkers(s, 1)).toBe(false)
    expect(toggleWorkers(s, 2)).toBe(false)
  })
})
