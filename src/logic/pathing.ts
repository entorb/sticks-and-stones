import { WALK_SPEED } from "./balance.ts"
import { tileAt } from "./map.ts"
import { isKeep } from "./state.ts"
import type { GameMap, Point } from "./types.ts"

const DIRS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/** Cost to step onto (x, y); Infinity = blocked. */
function stepCost(map: GameMap, x: number, y: number): number {
  const t = tileAt(map, x, y)
  const speed = t === undefined ? 0 : WALK_SPEED[t]
  return speed > 0 ? 1 / speed : Number.POSITIVE_INFINITY
}

/** Remove and return the open tile with the lowest distance. */
function popMin(open: number[], dist: number[]): number {
  let best = 0
  for (let k = 1; k < open.length; k++) {
    if ((dist[open[k] ?? 0] ?? 0) < (dist[open[best] ?? 0] ?? 0)) best = k
  }
  return open.splice(best, 1)[0] ?? 0
}

/** Walking cost from every tile to the keep (Dijkstra); Infinity = no path. */
export function flowField(map: GameMap): number[] {
  const dist = new Array<number>(map.width * map.height).fill(Number.POSITIVE_INFINITY)
  const open: number[] = []
  for (let i = 0; i < dist.length; i++) {
    if (!isKeep(map, i % map.width, Math.floor(i / map.width))) continue
    dist[i] = 0
    open.push(i)
  }
  // shortcut: linear-scan priority queue, O(n²) on 768 tiles; use a heap if maps grow
  while (open.length > 0) {
    const i = popMin(open, dist)
    const x = i % map.width
    const y = Math.floor(i / map.width)
    for (const d of DIRS) {
      const nx = x + d.x
      const ny = y + d.y
      // walking from the neighbor toward the keep costs the neighbor tile itself
      const nd = (dist[i] ?? 0) + stepCost(map, nx, ny)
      const ni = ny * map.width + nx
      if (tileAt(map, nx, ny) === undefined || nd >= (dist[ni] ?? 0)) continue
      if (!open.includes(ni)) open.push(ni)
      dist[ni] = nd
    }
  }
  return dist
}

/** Neighbor of (x, y) one step closer to the keep, or null if none. */
export function nextTile(map: GameMap, field: number[], x: number, y: number): Point | null {
  let best: Point | null = null
  let bestDist = field[y * map.width + x] ?? Number.POSITIVE_INFINITY
  for (const d of DIRS) {
    const nx = x + d.x
    const ny = y + d.y
    const nd =
      tileAt(map, nx, ny) === undefined
        ? Number.POSITIVE_INFINITY
        : (field[ny * map.width + nx] ?? 0)
    if (nd < bestDist) {
      best = { x: nx, y: ny }
      bestDist = nd
    }
  }
  return best
}
