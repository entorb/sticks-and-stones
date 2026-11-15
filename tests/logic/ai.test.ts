import { describe, expect, it } from "vitest"
import { ENEMIES, MAYOR, TICKS_PER_SEC, UNIT_SPACING } from "../../src/logic/balance.ts"
import { dist, newUnit, separate } from "../../src/logic/battle.ts"
import { startWave, stepBattle } from "../../src/logic/combat.ts"
import { newGame } from "../../src/logic/state.ts"
import { Terrain } from "../../src/logic/types.ts"

/** 12×7 grass, hut at (9,2), spawn at (0,3), no peasants. */
function battle() {
  const map = {
    width: 12,
    height: 7,
    tiles: new Array<Terrain>(84).fill(Terrain.Grass),
    hut: { x: 9, y: 2 },
    spawns: [{ x: 0, y: 3 }],
  }
  const s = newGame(1, map)
  s.peasants = 0
  return { s, b: startWave(s) }
}

const raider = (id: number, x: number, y: number) => ({
  ...newUnit(id, { x, y }, ENEMIES.raider.hp),
  kind: "raider" as const,
})

describe("battle ai", () => {
  it("units on the same spot are pushed apart", () => {
    const { b } = battle()
    b.enemies = [raider(1, 3, 3), raider(2, 3, 3), raider(3, 3.1, 3)]
    for (let i = 0; i < 5; i++) separate(b)
    const [a, c, d] = b.enemies
    if (!(a && c && d)) throw new Error("enemies missing")
    for (const [u, v] of [
      [a, c],
      [a, d],
      [c, d],
    ] as const) {
      expect(dist(u, v)).toBeGreaterThan(UNIT_SPACING * 0.9)
    }
  })

  it("an enemy next to the mayor attacks the mayor", () => {
    const { s, b } = battle()
    b.spawns = []
    b.enemies = [raider(1, b.mayor.x - 1.4, b.mayor.y)]
    stepBattle(s, b, TICKS_PER_SEC)
    expect(b.mayor.hp).toBeLessThan(MAYOR.hp)
  })
})
