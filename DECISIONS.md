# Decisions

- **Phaser 4** instead of Phaser 3: same as the `../raptor` template, current version.
- **Pre-commit**: prek runs the generic file hooks (as in raptor). The pnpm gates run via
  `scripts/run_checks.sh` and in CI; running build + e2e on every commit is too slow.
- **No Sentry / Matomo** for now.
- **Scale.RESIZE**: canvas fills the window in portrait and landscape (PLAN: both orientations).
- **Tests** live in `tests/logic/` and `tests/e2e/` as in PLAN.md (raptor colocates them).
