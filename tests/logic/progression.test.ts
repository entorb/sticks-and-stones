import { describe, expect, it } from "vitest"
import {
  BUILDINGS,
  CHECKPOINTS,
  ENEMIES,
  PILE_ADVANCE,
  RENOWN,
  REPUTATION,
  TICKS_PER_SEC,
} from "../../src/logic/balance.ts"
import { placeBuilding } from "../../src/logic/building.ts"
import { startWave, stepBattle, winStage } from "../../src/logic/combat.ts"
import { buyPileAdvance, earnRenown, nextStage } from "../../src/logic/progression.ts"
import { newGame } from "../../src/logic/state.ts"
import { type GameState, type Profile, Terrain } from "../../src/logic/types.ts"

/** 12×7 grass, hut at (9,2), spawn at (0,3), one rock pile at (6,3), 2 idle peasants. */
function field(): GameState {
  const map = {
    width: 12,
    height: 7,
    tiles: new Array<Terrain>(84).fill(Terrain.Grass),
    hut: { x: 9, y: 2 },
    spawns: [{ x: 0, y: 3 }],
  }
  const s = newGame(1, map)
  s.peasants = 2
  expect(placeBuilding(s, "rockPile", 6, 3)).toBeNull()
  return s
}

describe("rocks, loot, renown", () => {
  it("throwing uses pile rocks, not the stone stockpile; kills give loot; piles refill", () => {
    const s = field()
    const stone = s.res.stone
    const b = startWave(s)
    b.spawns = [{ tick: 0, kind: "raider" }]
    while (b.result === "running" && b.tick < 2000) stepBattle(s, b, TICKS_PER_SEC)
    expect(b.result).toBe("won")
    const pile = s.buildings[0]
    expect(pile?.rocks).toBeLessThan(BUILDINGS.rockPile.rocks ?? 0)
    expect(s.res.stone).toBe(stone)
    expect(b.loot).toEqual(ENEMIES.raider.loot)
    winStage(s, b)
    expect(pile?.rocks).toBe(BUILDINGS.rockPile.rocks)
  })

  it("renown per won stage, checkpoint bonus once; new village starts there", () => {
    const p = { renown: 0, checkpoint: 1 }
    expect(earnRenown(p, 5, 6)).toBe(5 * RENOWN.perStage + RENOWN.checkpoint)
    expect(p.checkpoint).toBe(6)
    expect(earnRenown(p, 5, 6)).toBe(5 * RENOWN.perStage)
    const s = newGame(1, undefined, p.checkpoint)
    expect(s.stage).toBe(6)
    expect(s.peasants).toBe(CHECKPOINTS[1].peasants)
    expect(s.reputation).toBe(0)
  })

  it("a win gives Reputation (more if flawless) and 1 + floor(rep / arrivalsPer) peasants", () => {
    const s = field()
    s.reputation = REPUTATION.arrivalsPer - 1
    const won = startWave(s)
    won.spawns = []
    stepBattle(s, won, TICKS_PER_SEC)
    expect(won.flawless).toBe(false)
    expect(winStage(s, won)).toMatchObject({ reputation: REPUTATION.win, peasants: 2 })
    expect(s).toMatchObject({ stage: 2, peasants: 4, reputation: REPUTATION.arrivalsPer })
    s.stage = BUILDINGS.palisade.unlockStage
    expect(placeBuilding(s, "palisade", 3, 0)).toBeNull()
    const flawless = startWave(s)
    flawless.spawns = []
    stepBattle(s, flawless, TICKS_PER_SEC)
    expect(winStage(s, flawless).reputation).toBe(REPUTATION.flawless)
    expect(s.reputation).toBe(REPUTATION.arrivalsPer + REPUTATION.flawless)
  })

  it("peasants at an empty pile switch to the next pile with rocks", () => {
    const s = field()
    expect(placeBuilding(s, "rockPile", 6, 5)).toBeNull()
    const [first, second] = s.buildings
    if (first) first.rocks = 0
    const b = startWave(s)
    b.spawns = [0, 20, 40].map((tick) => ({ tick, kind: "raider" as const }))
    while (b.result === "running" && b.tick < 2000) stepBattle(s, b, TICKS_PER_SEC)
    expect(b.result).toBe("won")
    expect(second?.rocks).toBeLessThan(BUILDINGS.rockPile.rocks ?? 0)
  })

  it("the rock pile advance costs Renown and enlarges piles from the next refill", () => {
    const p: Profile = { renown: PILE_ADVANCE.renown[0] + 1, checkpoint: 1 }
    expect(buyPileAdvance(p)).toBe(true)
    expect(p).toEqual({ renown: 1, checkpoint: 1, pileLevel: 1 })
    expect(buyPileAdvance(p)).toBe(false)
    const s = field()
    s.pileLevel = p.pileLevel
    nextStage(s)
    const full = (BUILDINGS.rockPile.rocks ?? 0) + PILE_ADVANCE.rocks
    expect(s.buildings[0]?.rocks).toBe(full)
    expect(placeBuilding(s, "rockPile", 6, 5)).toBeNull()
    expect(s.buildings[1]?.rocks).toBe(full)
  })
})
