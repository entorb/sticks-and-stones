import { WALK_SPEED } from "./balance.ts"
import { tileAt } from "./map.ts"
import type { GameMap, Point } from "./types.ts"

/** Map plus extra walking cost per tile index (walls); Infinity blocks the tile. */
export interface Grid extends GameMap {
  costs?: ReadonlyMap<number, number>
}

/** 8 neighbors; diagonals cost √2. */
const DIRS: readonly (Point & { len: number })[] = [
  { x: 1, y: 0, len: 1 },
  { x: -1, y: 0, len: 1 },
  { x: 0, y: 1, len: 1 },
  { x: 0, y: -1, len: 1 },
  { x: 1, y: 1, len: Math.SQRT2 },
  { x: 1, y: -1, len: Math.SQRT2 },
  { x: -1, y: 1, len: Math.SQRT2 },
  { x: -1, y: -1, len: Math.SQRT2 },
]
/** How many path steps a unit looks ahead for a straight-line shortcut. */
const LOOKAHEAD = 6
/** Line-of-sight sample spacing in tiles. */
const SAMPLE = 0.1

const extra = (map: Grid, x: number, y: number): number => map.costs?.get(y * map.width + x) ?? 0

/** Walk speed factor of a tile; 0 = blocked or outside the map. */
export function walkSpeed(map: Grid, x: number, y: number): number {
  const t = tileAt(map, x, y)
  return t === undefined || extra(map, x, y) === Number.POSITIVE_INFINITY ? 0 : WALK_SPEED[t]
}

/** Walkable and free of walls. */
const open = (map: Grid, x: number, y: number) => walkSpeed(map, x, y) > 0 && extra(map, x, y) === 0

/** Diagonal steps may not cut the corner of a blocked tile or a wall. */
const canStep = (map: Grid, x: number, y: number, d: Point): boolean =>
  walkSpeed(map, x + d.x, y + d.y) > 0 &&
  (d.x === 0 || d.y === 0 || (open(map, x + d.x, y) && open(map, x, y + d.y)))

/** Remove and return the open tile with the lowest distance. */
function popMin(open: number[], dist: number[]): number {
  let best = 0
  for (let k = 1; k < open.length; k++) {
    if ((dist[open[k] ?? 0] ?? 0) < (dist[open[best] ?? 0] ?? 0)) best = k
  }
  return open.splice(best, 1)[0] ?? 0
}

/** Walking cost from every tile to the nearest `goals` tile (Dijkstra, 8 neighbors); Infinity = no path. */
export function flowField(map: Grid, goals: Point[]): number[] {
  const dist = new Array<number>(map.width * map.height).fill(Number.POSITIVE_INFINITY)
  const queue = goals.map((g) => g.y * map.width + g.x)
  for (const i of queue) dist[i] = 0
  // shortcut: linear-scan priority queue, O(n²) on 768 tiles; use a heap if maps grow
  while (queue.length > 0) {
    const i = popMin(queue, dist)
    const x = i % map.width
    const y = Math.floor(i / map.width)
    for (const d of DIRS) {
      const nx = x + d.x
      const ny = y + d.y
      if (!canStep(map, x, y, d)) continue
      // walking from the neighbor toward the goal costs the neighbor tile's terrain
      const nd = (dist[i] ?? 0) + d.len / walkSpeed(map, nx, ny) + extra(map, nx, ny)
      const ni = ny * map.width + nx
      if (nd >= (dist[ni] ?? 0)) continue
      if (!queue.includes(ni)) queue.push(ni)
      dist[ni] = nd
    }
  }
  return dist
}

/** Neighbor of (x, y) one step closer to the field's goal, or null if none. */
export function nextTile(map: Grid, field: number[], x: number, y: number): Point | null {
  let best: Point | null = null
  let bestDist = field[y * map.width + x] ?? Number.POSITIVE_INFINITY
  for (const d of DIRS) {
    if (!canStep(map, x, y, d)) continue
    const nd = field[(y + d.y) * map.width + x + d.x] ?? Number.POSITIVE_INFINITY
    if (nd < bestDist) {
      best = { x: x + d.x, y: y + d.y }
      bestDist = nd
    }
  }
  return best
}

/** Straight line a→b stays on full-speed tiles (except at its ends) and never crosses a wall. */
export function lineWalkable(map: Grid, a: Point, b: Point): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / SAMPLE)
  const ta = { x: Math.round(a.x), y: Math.round(a.y) }
  const tb = { x: Math.round(b.x), y: Math.round(b.y) }
  for (let k = 1; k < n; k++) {
    const x = Math.round(a.x + ((b.x - a.x) * k) / n)
    const y = Math.round(a.y + ((b.y - a.y) * k) / n)
    const end = (x === ta.x && y === ta.y) || (x === tb.x && y === tb.y)
    const speed = walkSpeed(map, x, y)
    if (speed === 0 || extra(map, x, y) > 0 || (speed < 1 && !end)) return false
  }
  return true
}

/**
 * Where a unit at (x, y) should head next: the farthest of the next LOOKAHEAD path tiles it can
 * reach in a straight line. Returns null at the goal or without a path.
 */
export function waypoint(map: Grid, field: number[], pos: Point): Point | null {
  let tile = { x: Math.round(pos.x), y: Math.round(pos.y) }
  let best: Point | null = null
  for (let k = 0; k < LOOKAHEAD; k++) {
    const next = nextTile(map, field, tile.x, tile.y)
    if (!next) break
    if (best && !lineWalkable(map, pos, next)) break
    best = next
    tile = next
  }
  return best
}
