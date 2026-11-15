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
  reachable from the keep without crossing water.
- **Forest and rock** (can enemies walk through?): decided in M3 (pathing). Map generation only guarantees water
  does not cut off spawns.
