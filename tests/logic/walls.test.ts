import { describe, expect, it } from "vitest"
import { BUILDINGS, TICKS_PER_SEC, UPGRADE } from "../../src/logic/balance.ts"
import { placeBuilding } from "../../src/logic/building.ts"
import { startWave, stepBattle } from "../../src/logic/combat.ts"
import { newGame } from "../../src/logic/state.ts"
import { type GameState, Terrain } from "../../src/logic/types.ts"
import { repairWall } from "../../src/logic/walls.ts"

/** 12×7 grass, hut at (9,2), spawn at (0,3), palisades at x = 5 on `rows`; everything unlocked. */
function walled(rows: number[]): GameState {
  const map = {
    width: 12,
    height: 7,
    tiles: new Array<Terrain>(84).fill(Terrain.Grass),
    hut: { x: 9, y: 2 },
    spawns: [{ x: 0, y: 3 }],
  }
  const s = newGame(1, map)
  s.stage = 99
  s.peasants = 0
  s.res = { wood: 1000, stone: 1000 }
  for (const y of rows) expect(placeBuilding(s, "palisade", 5, y)).toBeNull()
  return s
}

const walls = (s: GameState) => s.buildings.filter((b) => b.type === "palisade")

/** Run with one enemy of `kind` until it reaches x > 5 or a wall breaks; returns ticks. */
function run(s: GameState, kind: "raider" | "ram"): number {
  const b = startWave(s)
  b.spawns = [{ tick: 0, kind }]
  const count = walls(s).length
  while (b.tick < 2000 && walls(s).length === count && !b.enemies.some((e) => e.x > 5.5)) {
    stepBattle(s, b, TICKS_PER_SEC)
  }
  return b.tick
}

describe("walls", () => {
  it("enemies walk around a wall with a gap", () => {
    const s = walled([0, 1, 2, 3, 4, 5])
    run(s, "raider")
    expect(walls(s)).toHaveLength(6)
    expect(walls(s).every((w) => w.hp === BUILDINGS.palisade.hp)).toBe(true)
  })

  it("enemies attack a wall that closes the way", () => {
    const s = walled([0, 1, 2, 3, 4, 5, 6])
    run(s, "raider")
    expect(walls(s)).toHaveLength(6)
  })

  it("the ram breaks a palisade much faster than a raider", () => {
    const ram = run(walled([0, 1, 2, 3, 4, 5, 6]), "ram")
    const raider = run(walled([0, 1, 2, 3, 4, 5, 6]), "raider")
    // the ram walks at half speed, so most of its time is the walk
    expect(ram).toBeLessThan(raider / 2)
  })

  it("repairs with wood, upgrades a palisade to stone in place", () => {
    const s = walled([0])
    const w = s.buildings[0]
    if (!w) throw new Error("no wall")
    w.hp = 15
    expect(repairWall(s, w.id)).toBe(true)
    expect(w.hp).toBe(BUILDINGS.palisade.hp)
    expect(s.res.wood).toBe(1000 - 5 - 3)
    expect(placeBuilding(s, "stoneWall", 5, 0)).toBeNull()
    expect(w.type).toBe("stoneWall")
    expect(w.hp).toBe(BUILDINGS.stoneWall.hp)
    expect(s.res.stone).toBe(1000 - UPGRADE.cost.stone)
  })
})
