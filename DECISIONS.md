# Decisions

- **Phaser 4** instead of Phaser 3: same as the `../raptor` template, current version.
- **Pre-commit**: prek runs the generic file hooks (as in raptor). The pnpm gates run via
  `scripts/run_checks.sh` and in CI; running build + e2e on every commit is too slow.
- **No Sentry / Matomo** for now.
- **Scale.RESIZE**: canvas fills the window in portrait and landscape (PLAN: both orientations).
- **Tests** live in `tests/logic/` and `tests/e2e/` as in PLAN.md (raptor colocates them).
- **Mayor's hut** (2×2 tiles, map center, `MAP.hutSize`) replaces the keep for the first levels
  (owner decision; a keep may come later). The mayor (`MAYOR`: 25 HP, melee) fights from its center; melee reach to and from the mayor counts from the hut wall
  (`MAYOR.radius`). The village is lost when the mayor dies. Full HP every wave. A radius
  of 4 tiles around the hut stays grass.
- **Art**: procedural placeholder textures (`src/scenes/textures.ts`) instead of Kenney for now,
  no asset download needed. Swap in Kenney tiles later.
- **Spawns**: 1 edge spawn for now (`MAP.spawnCount`), more in later stages. Spawns are always
  reachable from the hut over walkable terrain.
- **Terrain movement** (owner decision, `WALK_SPEED` in `balance.ts`): forest = 50 % walk speed,
  rock and water block movement.
- **Adjacency** for woodcutter/quarry counts all 8 neighbors (diagonals too).
- **Workers**: a new work building takes an idle peasant automatically; tap it (no tool selected)
  to free or reassign the worker. Unstaffed buildings are drawn faded and produce nothing.
- **Payout** happens when the next stage begins (`nextStage`), not at stage 1.
- **Peasants in battle** (owner decision: all peasants defend): workers start at their building,
  idle peasants at the hut; each uses its nearest rock pile (straight distance, no slot limit).
  Without a rock it walks to within `PEASANT.pickupReach` of the pile (beside it, never on it) and
  picks one up (1 stockpile stone per `throwsPerStone` rocks). With a rock it waits there, or walks
  straight toward the nearest enemy within `PEASANT.alertRange` of its pile until in throw range,
  throws, and goes back. No pile: idle peasants stay inside the hut, workers at their building.
  Workers (owner decision) hit any enemy within `PEASANT.toolRange` with their tool, even when
  carrying a rock; when the stockpile is out of stones (or there is no pile) they charge enemies
  within `alertRange` of their pile (or building) in a straight line. Idle peasants have no tools.
  Dead workers leave their building unstaffed.
- **Enemies** (owner decision: attack all peasants) leave their path to attack any peasant or the mayor within `ENEMY_AGGRO` (2.5 tiles)
  and a straight walk.
- **Rocks** are projectiles in the logic (`PEASANT.rockSpeed`), damage lands on hit. Throwers skip
  enemies that rocks in flight will already kill.
- **Movement** (owner decision) is free: 8-direction flow field plus straight-line shortcuts over the next 6 path
  tiles (`waypoint`, `lineWalkable`; shortcuts avoid forest). Units don't block each other.
  Buildings don't block units yet (walls come in M4).
- **Loss** refounds the village at the mayor's highest checkpoint (`CHECKPOINTS`), Renown kept;
  the village's Reputation is lost with it (owner decision, roguelike core).
- **Loot** (owner decision) per kill (`ENEMIES[k].loot`), paid on a win; replaces flat plunder.
- **Economy** (owner decisions): peasants only from arrivals (`1 + floor(reputation / 3)` per won
  stage, after Reputation +1, or +2 flawless); no houses. Ammo: rock piles and towers hold
  `rocks` (25), refilled free each build phase; no stockpile stone per throw. Rising cost: base ×
  (1 + `COST_GROWTH` × same-type count), rounded; walls and towers flat. No selling (owner
  decision): buildings are permanent. Waves don't grow
  with Reputation (PLAN's `× (1 + 0.1 × reputation)` dropped).
- **Walls** (M4): palisade, gate, stone wall and tower are 1-tile buildings with HP (`BUILDINGS`).
  Enemies treat a wall tile as passable at `hp × WALL_PATH_COST` extra tiles in their flow field:
  they walk around unless the detour is longer than breaking through; then they hit the wall in
  their way (reach from the tile edge). A broken wall is removed and the enemy field recomputed.
  Peasants can't pass palisades; gates, stone walls and towers let them through and stand on them.
  Diagonal steps never squeeze between two walls. Walls keep their damage between waves.
- **Wall prices** are flat (no rising cost); building a stone wall on a palisade upgrades it in
  place for `UPGRADE.cost`. No building on spawn tiles.
- **Repair**: tap a damaged wall without a tool; repairs as far as the stockpile allows (1 wood or
  stone per `REPAIR_HP`). Wooden walls (paid in wood) use wood and burn (torchbearers deal
  `FIRE_DAMAGE`×).
- **Towers** are defense spots like rock piles for up to `TOWER_HOLDS` peasants, who stand on them
  and fetch rocks there. Peasants standing on a stone wall or tower throw farther (`rangeBonus`);
  stone walls are not assigned posts yet, the bonus applies when a peasant happens to stand there.
- **Flawless**: +2 Reputation when walls stood at the start of the wave and none was hit.
- **Enemies**: torchbearer (fast, burns wood), armored bandit (tough, slow), ram (slow, very tough,
  ignores peasants, 25 wall damage). Mini boss 5 = mob of 24 raiders, 10 = 2 rams leading a mixed
  wave; stage 6 is a breather. Spawn order is by kind (rams first), not interleaved.
- **Build bar** shows unlocked buildings only and wraps into rows on narrow screens; the extra row
  overlaps the map bottom (camera inset unchanged).
- **Pile switching** (M5): a peasant at an empty pile takes the nearest reachable pile or tower
  with rocks (towers only with room, `TOWER_HOLDS`); straight-line nearest, like mustering.
