# Decisions

- **Phaser 4** instead of Phaser 3: same as the `../raptor` template, current version.
- **Pre-commit**: prek runs the generic file hooks (as in raptor). The pnpm gates run via
  `scripts/run_checks.sh` and in CI; running build + e2e on every commit is too slow.
- **No Sentry / Matomo** for now.
- **Scale.RESIZE**: canvas fills the window in portrait and landscape (PLAN: both orientations).
- **Tests** live in `tests/logic/` and `tests/e2e/` as in PLAN.md (raptor colocates them).
- **Mayor's hut** (2×2 tiles, map center, `MAP.hutSize`) replaces the keep for the first levels. The mayor (`MAYOR`:
  25 HP, melee) fights from its center; melee reach to and from the mayor counts from the hut wall
  (`MAYOR.radius`). The village is lost when the mayor dies. Full HP every wave. A radius
  of 4 tiles around the hut stays grass.
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
- **Peasants in battle**: workers stand at their building; idle peasants walk from the hut to the
  free rock pile slots (2 per pile, piles nearest to the hut first) and throw once there. Idle
  peasants without a slot stay inside the hut, safe. Dead workers leave their building unstaffed.
- **Enemies** leave their path to attack any peasant or the mayor within `ENEMY_AGGRO` (2.5 tiles)
  and a straight walk.
- **Rocks** are projectiles in the logic (`PEASANT.rockSpeed`), damage lands on hit. Throwers skip
  enemies that rocks in flight will already kill.
- **Movement** is free: 8-direction flow field plus straight-line shortcuts over the next 6 path
  tiles (`waypoint`, `lineWalkable`; shortcuts avoid forest). Units don't block each other.
  Buildings don't block units yet (walls come in M4).
- **Loss** restarts a fresh village at stage 1 until M6 adds Renown and checkpoints.
- **Plunder** for a won stage: 10 wood + 5 stone (`PLUNDER`).
