import { describe, expect, it } from "vitest"
import { PLUNDER, TICKS_PER_SEC } from "../../src/logic/balance.ts"
import { placeBuilding } from "../../src/logic/building.ts"
import { simulateWave, startWave, stepBattle, winStage } from "../../src/logic/combat.ts"
import { newGame } from "../../src/logic/state.ts"
import type { GameState } from "../../src/logic/types.ts"
import { stateFrom } from "./helpers.ts"

/** Corridor: spawn left, keep (12,1)-(13,2) right. */
function corridor(): GameState {
  const s = stateFrom(["..............", "..............", "..............", ".............."], {
    x: 12,
    y: 1,
  })
  s.map.spawns = [{ x: 0, y: 1 }]
  return s
}

describe("stage 1", () => {
  it("is won with 4 throwers on 2 rock piles", () => {
    const s = corridor()
    placeBuilding(s, "rockPile", 9, 0)
    placeBuilding(s, "rockPile", 9, 3)
    const b = simulateWave(s, TICKS_PER_SEC)
    expect(b.result).toBe("won")
    expect(s.peasants).toBe(4)
  })

  it("is lost with 0 throwers", () => {
    const s = corridor()
    expect(simulateWave(s, TICKS_PER_SEC).result).toBe("lost")
  })

  it("is won on generated maps with 2 rock piles next to the keep", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = newGame(seed)
      const k = s.map.hut
      expect(placeBuilding(s, "rockPile", k.x - 1, k.y)).toBeNull()
      expect(placeBuilding(s, "rockPile", k.x + 2, k.y + 1)).toBeNull()
      expect(simulateWave(s, TICKS_PER_SEC).result).toBe("won")
    }
  })
})

describe("combat", () => {
  it("uses 1 stone per 5 throws", () => {
    const s = corridor()
    placeBuilding(s, "rockPile", 9, 0)
    const stone = s.res.stone
    const b = startWave(s)
    let throws = 0
    while (b.result === "running") {
      stepBattle(s, b, TICKS_PER_SEC)
      throws += b.events.filter((e) => e.type === "throw").length
    }
    expect(stone - s.res.stone).toBe(Math.ceil(throws / 5))
  })

  it("raiders kill a lone thrower in their way", () => {
    const s = corridor()
    s.stage = 4
    s.peasants = 1
    placeBuilding(s, "rockPile", 6, 1)
    placeBuilding(s, "rockPile", 6, 2)
    simulateWave(s, TICKS_PER_SEC)
    expect(s.peasants).toBe(0)
  })

  it("winStage adds plunder and moves to the next stage", () => {
    const s = corridor()
    const wood = s.res.wood
    expect(winStage(s)).toEqual({ wood: PLUNDER.wood, stone: PLUNDER.stone })
    expect(s.stage).toBe(2)
    expect(s.res.wood).toBe(wood + PLUNDER.wood)
  })
})
