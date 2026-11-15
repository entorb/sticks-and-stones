import { describe, expect, it } from "vitest"
import { MAP, TICKS_PER_SEC } from "../../src/logic/balance.ts"
import { placeBuilding } from "../../src/logic/building.ts"
import { simulateWave, winStage } from "../../src/logic/combat.ts"
import { hutCenter } from "../../src/logic/map.ts"
import { idlePeasants, newGame } from "../../src/logic/state.ts"
import type { BuildingType, GameState } from "../../src/logic/types.ts"
import { repairWall } from "../../src/logic/walls.ts"

/** Wall ring this many tiles out from the hut; rock piles go inside it. */
const RING = 3

/** Free tiles by distance from the hut center. */
function byDistance(s: GameState): { x: number; y: number; d: number }[] {
  const h = hutCenter(s.map)
  const tiles: { x: number; y: number; d: number }[] = []
  for (let y = 0; y < s.map.height; y += 1)
    for (let x = 0; x < s.map.width; x += 1) tiles.push({ x, y, d: Math.hypot(x - h.x, y - h.y) })
  return tiles.sort((a, b) => a.d - b.d)
}

const build = (s: GameState, type: BuildingType, min: number, max: number) =>
  byDistance(s).some((t) => t.d >= min && t.d < max && !placeBuilding(s, type, t.x, t.y))

const count = (s: GameState, type: BuildingType) =>
  s.buildings.filter((b) => b.type === type).length

/** Square ring around the hut; palisade rings get a gate in the middle of each side. */
function ring(s: GameState, type: BuildingType): void {
  const { hut } = s.map
  const lo = { x: hut.x - RING, y: hut.y - RING }
  const hi = { x: hut.x + MAP.hutSize - 1 + RING, y: hut.y + MAP.hutSize - 1 + RING }
  for (let y = lo.y; y <= hi.y; y += 1)
    for (let x = lo.x; x <= hi.x; x += 1) {
      const edge = x === lo.x || x === hi.x || y === lo.y || y === hi.y
      const gate = type === "palisade" && (x === hut.x || y === hut.y)
      if (edge) placeBuilding(s, gate ? "gate" : type, x, y)
    }
}

/** Build bot: repair walls; towers + stone ring from stage 10, palisade ring from 5; one rock
 * pile per 3 peasants; half the peasants work (2 woodcutters per quarry). */
function buildPhase(s: GameState): void {
  for (const b of [...s.buildings]) repairWall(s, b.id)
  const { hut } = s.map
  if (s.stage >= 10) {
    const far = RING + MAP.hutSize - 1
    for (const [dx, dy] of [
      [-RING, -RING],
      [far, -RING],
      [-RING, far],
      [far, far],
    ] as const)
      placeBuilding(s, "tower", hut.x + dx, hut.y + dy)
    ring(s, "stoneWall")
  }
  if (s.stage >= 5) ring(s, "palisade")
  while (count(s, "rockPile") < Math.ceil(s.peasants / 3) && build(s, "rockPile", 2, RING)) {
    // keep building
  }
  while (idlePeasants(s) > s.peasants / 2) {
    const type = count(s, "woodcutter") >= 2 * count(s, "quarry") ? "quarry" : "woodcutter"
    if (!build(s, type, 2, Number.POSITIVE_INFINITY)) break
  }
}

describe("campaign", () => {
  it.each([1, 2, 3])("a scripted build survives stages 1-10 (seed %i)", (seed) => {
    const s = newGame(seed)
    while (s.stage <= 10) {
      buildPhase(s)
      const b = simulateWave(s, TICKS_PER_SEC)
      expect(b.result, `stage ${s.stage}`).toBe("won")
      winStage(s, b)
    }
  })
})
