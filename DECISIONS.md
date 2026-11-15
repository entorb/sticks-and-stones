# Decisions

- **Phaser 4** instead of Phaser 3: same as the `../raptor` template, current version.
- **Pre-commit**: prek runs the generic file hooks (as in raptor). The pnpm gates run via
  `scripts/run_checks.sh` and in CI; running build + e2e on every commit is too slow.
- **No Sentry / Matomo** for now.
- **Scale.RESIZE**: canvas fills the window in portrait and landscape (PLAN: both orientations).
- **Tests** live in `tests/logic/` and `tests/e2e/` as in PLAN.md (raptor colocates them).
- **Keep** is 2×2 tiles in the center; a radius of 4 tiles around it stays grass.
- **Art**: procedural placeholder textures (`src/scenes/textures.ts`) instead of Kenney for now,
  no asset download needed. Swap in Kenney tiles later.
- **Spawns**: 1 edge spawn for now (`MAP.spawnCount`), more in later stages. Spawns are always
  reachable from the keep over walkable terrain.
- **Terrain movement** (`WALK_SPEED` in `balance.ts`): forest = 50 % walk speed, rock and water
  block movement.
- **Adjacency** for woodcutter/quarry counts all 8 neighbors (diagonals too).
- **Workers**: a new work building takes an idle peasant automatically; tap it (no tool selected)
  to free or reassign the worker. Unstaffed buildings are drawn faded and produce nothing.
- **Payout** happens when the next stage begins (`nextStage`), not at stage 1.
- **Defend!** in M2 only advances the stage (no wave yet). M3 replaces it with the real wave.
- **Throwers** are placed on their rock pile at wave start (no walking), 2 per pile, piles nearest
  to the keep first. Peasants without a pile stay inside the keep and don't fight.
- **Hits** are applied when the rock is thrown; the flying rock is only visual.
- **Pathing** uses 4 neighbors. Buildings don't block enemies yet (walls come in M4).
- **Loss** restarts a fresh village at stage 1 until M6 adds the mayor and checkpoints.
- **Plunder** for a won stage: 10 wood + 5 stone (`PLUNDER`).
