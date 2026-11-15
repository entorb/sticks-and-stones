// Dev/debug helpers: build a game from URL-style params and print a battle as text.
import type { Battle } from "./battle.ts"
import { placeBuilding } from "./building.ts"
import { hutCenter, isHut } from "./map.ts"
import { newGame } from "./state.ts"
import type { BuildingType, GameState } from "./types.ts"

const PLACE: [param: string, type: BuildingType][] = [
  ["piles", "rockPile"],
  ["woodcutters", "woodcutter"],
  ["quarries", "quarry"],
]

/** Place up to `n` buildings of `type` on the free tiles nearest the hut. */
function placeNearHut(s: GameState, type: BuildingType, n: number): void {
  const hut = hutCenter(s.map)
  const tiles: { x: number; y: number; d: number }[] = []
  for (let y = 0; y < s.map.height; y++)
    for (let x = 0; x < s.map.width; x++) tiles.push({ x, y, d: Math.hypot(x - hut.x, y - hut.y) })
  tiles.sort((a, b) => a.d - b.d)
  let left = n
  for (const t of tiles) {
    // skip the ring right at the hut so piles don't wall it in
    if (left > 0 && t.d >= 2 && !placeBuilding(s, type, t.x, t.y)) left -= 1
  }
}

/** Game from params: seed, stage, peasants, reputation, piles, woodcutters, quarries, wood, stone. */
export function scenario(q: URLSearchParams): GameState {
  const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined)
  const s = newGame(num("seed") ?? Date.now())
  s.stage = num("stage") ?? s.stage
  s.peasants = num("peasants") ?? s.peasants
  s.reputation = num("reputation") ?? s.reputation
  const res = { ...s.res }
  s.res = { wood: 1e6, stone: 1e6 }
  for (const [param, type] of PLACE) placeNearHut(s, type, num(param) ?? 0)
  s.res = { wood: num("wood") ?? res.wood, stone: num("stone") ?? res.stone }
  return s
}

const TERRAIN_CH = [".", "T", "^", "~"]
const BUILDING_CH: Record<BuildingType, string> = { woodcutter: "w", quarry: "q", rockPile: "o" }

/** Map as text: terrain . T ^ ~, hut H, buildings w q o; units M mayor, W worker, P idle
 * peasant (lowercase = carrying a rock), E enemy. Then one line per unit. */
export function asciiBattle(s: GameState, b: Battle): string {
  const rows = Array.from({ length: s.map.height }, (_, y) =>
    Array.from({ length: s.map.width }, (_, x) =>
      isHut(s.map, x, y) ? "H" : (TERRAIN_CH[s.map.tiles[y * s.map.width + x] ?? 0] ?? "?"),
    ),
  )
  const put = (x: number, y: number, ch: string) => {
    const row = rows[Math.round(y)]
    if (row && Math.round(x) in row) row[Math.round(x)] = ch
  }
  for (const bd of s.buildings) put(bd.x, bd.y, BUILDING_CH[bd.type])
  for (const e of b.enemies) put(e.x, e.y, "E")
  for (const p of b.peasants) {
    const ch = p.role === "worker" ? "W" : "P"
    put(p.x, p.y, p.rock ? ch.toLowerCase() : ch)
  }
  put(b.mayor.x, b.mayor.y, "M")
  const units = [
    `M ${b.mayor.hp}hp`,
    ...b.peasants.map(
      (p) =>
        `${p.role[0]}${p.id}@${p.x.toFixed(1)},${p.y.toFixed(1)} ${p.hp}hp${p.rock ? " rock" : ""}`,
    ),
    ...b.enemies.map((e) => `E${e.id}@${e.x.toFixed(1)},${e.y.toFixed(1)} ${e.hp}hp`),
  ]
  const head = `tick ${b.tick} ${b.result} stone ${s.res.stone}`
  return [head, ...rows.map((r) => r.join("")), units.join(" | ")].join("\n")
}
