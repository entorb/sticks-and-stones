import { describe, expect, it } from "vitest"
import { TICKS_PER_SEC } from "../../src/logic/balance.ts"
import { placeBuilding } from "../../src/logic/building.ts"
import { simulateWave, winStage } from "../../src/logic/combat.ts"
import { deserialize, SAVE_VERSION, serialize } from "../../src/logic/save.ts"
import { newGame } from "../../src/logic/state.ts"

describe("save", () => {
  it("save → load round trip gives identical state", () => {
    const s = newGame(7)
    const { hut } = s.map
    expect(placeBuilding(s, "rockPile", hut.x - 2, hut.y)).toBeNull()
    winStage(s, simulateWave(s, TICKS_PER_SEC))
    const loaded = deserialize(serialize(s))
    expect(loaded).toEqual(s)
    expect(loaded).not.toBe(s)
  })

  it("broken, unknown or newer saves load as null", () => {
    const state = newGame(7)
    expect(deserialize("{")).toBeNull()
    expect(deserialize("null")).toBeNull()
    expect(deserialize(JSON.stringify({ v: SAVE_VERSION, state: {} }))).toBeNull()
    expect(deserialize(JSON.stringify({ v: SAVE_VERSION + 1, state }))).toBeNull()
    expect(deserialize(JSON.stringify({ v: 0, state }))).toBeNull()
  })
})
