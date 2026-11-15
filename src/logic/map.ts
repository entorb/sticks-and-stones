import { MAP, WALK_SPEED } from "./balance.ts"
import { createRng } from "./rng.ts"
import { type GameMap, type Point, Terrain } from "./types.ts"

type Rng = () => number
interface Cluster {
  count: number
  size: number
  minDist: number
  maxDist: number
}

const DIRS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

export const tileAt = (map: GameMap, x: number, y: number): Terrain | undefined =>
  x < 0 || y < 0 || x >= map.width || y >= map.height ? undefined : map.tiles[y * map.width + x]

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T

/** Center of the keep in tile units (fractional for even keep sizes). */
const keepCenter = (map: GameMap): Point => ({
  x: map.keep.x + (MAP.keepSize - 1) / 2,
  y: map.keep.y + (MAP.keepSize - 1) / 2,
})

const distToKeep = (map: GameMap, p: Point): number => {
  const c = keepCenter(map)
  return Math.hypot(p.x - c.x, p.y - c.y)
}

/** Random-walk blob of `terrain`, starting in a ring around the keep, never inside the clear zone. */
function growCluster(map: GameMap, rng: Rng, terrain: Terrain, c: Cluster): void {
  const angle = rng() * Math.PI * 2
  const dist = c.minDist + rng() * (c.maxDist - c.minDist)
  const kc = keepCenter(map)
  const clamp = (v: number, max: number) => Math.min(max - 1, Math.max(0, Math.round(v)))
  let p = {
    x: clamp(kc.x + Math.cos(angle) * dist, map.width),
    y: clamp(kc.y + Math.sin(angle) * dist, map.height),
  }
  for (let placed = 0, steps = 0; placed < c.size && steps < c.size * 8; steps++) {
    if (tileAt(map, p.x, p.y) === Terrain.Grass && distToKeep(map, p) > MAP.keepClearRadius) {
      map.tiles[p.y * map.width + p.x] = terrain
      placed++
    }
    const d = pick(rng, DIRS)
    const next = { x: p.x + d.x, y: p.y + d.y }
    if (tileAt(map, next.x, next.y) !== undefined) p = next
  }
}

/** Tiles reachable from the keep over walkable terrain (WALK_SPEED > 0). */
export function reachableFromKeep(map: GameMap): Set<number> {
  const seen = new Set<number>([map.keep.y * map.width + map.keep.x])
  const queue: Point[] = [map.keep]
  for (let p = queue.shift(); p; p = queue.shift()) {
    for (const d of DIRS) {
      const n = { x: p.x + d.x, y: p.y + d.y }
      const t = tileAt(map, n.x, n.y)
      const i = n.y * map.width + n.x
      if (t === undefined || WALK_SPEED[t] === 0 || seen.has(i)) continue
      seen.add(i)
      queue.push(n)
    }
  }
  return seen
}

function edgeTiles(map: GameMap): Point[] {
  const out: Point[] = []
  for (let x = 0; x < map.width; x++) out.push({ x, y: 0 }, { x, y: map.height - 1 })
  for (let y = 1; y < map.height - 1; y++) out.push({ x: 0, y }, { x: map.width - 1, y })
  return out
}

function pickSpawns(map: GameMap, rng: Rng): Point[] {
  const reach = reachableFromKeep(map)
  const candidates = edgeTiles(map).filter(
    (p) => tileAt(map, p.x, p.y) === Terrain.Grass && reach.has(p.y * map.width + p.x),
  )
  const spawns: Point[] = []
  while (spawns.length < MAP.spawnCount && candidates.length > 0) {
    const i = Math.floor(rng() * candidates.length)
    spawns.push(...candidates.splice(i, 1))
  }
  return spawns
}

/** Deterministic map from a seed: grass, terrain clusters around a central keep, edge spawns. */
export function generateMap(seed: number): GameMap {
  const rng = createRng(seed)
  const { width, height, keepSize } = MAP
  const map: GameMap = {
    width,
    height,
    tiles: new Array<Terrain>(width * height).fill(Terrain.Grass),
    keep: { x: Math.floor((width - keepSize) / 2), y: Math.floor((height - keepSize) / 2) },
    spawns: [],
  }
  for (const [terrain, c] of [
    [Terrain.Forest, MAP.forest],
    [Terrain.Rock, MAP.rock],
    [Terrain.Water, MAP.water],
  ] as const) {
    for (let i = 0; i < c.count; i++) growCluster(map, rng, terrain, c)
  }
  map.spawns = pickSpawns(map, rng)
  return map
}
