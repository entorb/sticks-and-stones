import { describe, expect, it } from "vitest"
import { MAP } from "../../src/logic/balance.ts"
import { generateMap, reachableFromKeep, tileAt } from "../../src/logic/map.ts"
import { Terrain } from "../../src/logic/types.ts"

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1)

describe("generateMap", () => {
  it("same seed gives same map", () => {
    expect(generateMap(123)).toEqual(generateMap(123))
  })

  it("different seeds give different maps", () => {
    expect(generateMap(1).tiles).not.toEqual(generateMap(2).tiles)
  })

  it("has the configured size and a centered keep on grass", () => {
    const map = generateMap(7)
    expect(map.tiles).toHaveLength(MAP.width * MAP.height)
    expect(map.keep).toEqual({ x: 15, y: 11 })
    for (let dy = 0; dy < MAP.keepSize; dy++)
      for (let dx = 0; dx < MAP.keepSize; dx++)
        expect(tileAt(map, map.keep.x + dx, map.keep.y + dy)).toBe(Terrain.Grass)
  })

  it.each(SEEDS)("seed %i: every terrain exists, spawns on the edge and reachable", (seed) => {
    const map = generateMap(seed)
    for (const t of [Terrain.Forest, Terrain.Rock, Terrain.Water]) expect(map.tiles).toContain(t)
    expect(map.spawns).toHaveLength(MAP.spawnCount)
    const reach = reachableFromKeep(map)
    for (const s of map.spawns) {
      const onEdge = s.x === 0 || s.y === 0 || s.x === map.width - 1 || s.y === map.height - 1
      expect(onEdge).toBe(true)
      expect(reach.has(s.y * map.width + s.x)).toBe(true)
    }
  })
})
