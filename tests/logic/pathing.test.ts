import { describe, expect, it } from "vitest"
import { flowField, nextTile } from "../../src/logic/pathing.ts"
import { mapFrom } from "./helpers.ts"

describe("flowField", () => {
  const map = mapFrom(["......", "FFR...", "......"], { x: 4, y: 0 })
  const field = flowField(map)
  const at = (x: number, y: number) => field[y * map.width + x]

  it("is 0 on the keep and grows with distance", () => {
    expect(at(4, 0)).toBe(0)
    expect(at(3, 0)).toBe(1)
    expect(at(0, 0)).toBe(4)
  })

  it("forest costs double, rock is blocked", () => {
    expect(at(1, 1)).toBe(5) // (1,0) is 3 away, stepping onto forest costs 2
    expect(at(2, 1)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe("nextTile", () => {
  it("walks around a rock wall into the keep", () => {
    const map = mapFrom(["......", "..R...", "..R..."], { x: 4, y: 0 })
    const field = flowField(map)
    let p = { x: 0, y: 2 }
    const path = [p]
    for (let n = nextTile(map, field, p.x, p.y); n; n = nextTile(map, field, p.x, p.y)) {
      p = n
      path.push(p)
    }
    expect(path[path.length - 1]).toEqual({ x: 4, y: 0 })
    expect(path.some((q) => q.x === 2 && q.y > 0)).toBe(false)
    expect(path).toHaveLength(7)
  })
})
