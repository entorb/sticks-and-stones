import { newGame } from "../../src/logic/state.ts"
import { type GameMap, type GameState, Terrain } from "../../src/logic/types.ts"

const CHAR: Record<string, Terrain> = {
  ".": Terrain.Grass,
  F: Terrain.Forest,
  R: Terrain.Rock,
  W: Terrain.Water,
}

/** Map from rows of `.FRW`; the keep (2×2) goes at `keep`. */
export function mapFrom(rows: string[], keep = { x: 0, y: 0 }): GameMap {
  return {
    width: rows[0]?.length ?? 0,
    height: rows.length,
    tiles: rows.flatMap((r) => [...r].map((c) => CHAR[c] ?? Terrain.Grass)),
    keep,
    spawns: [],
  }
}

export const stateFrom = (rows: string[], keep?: { x: number; y: number }): GameState =>
  newGame(1, mapFrom(rows, keep))
