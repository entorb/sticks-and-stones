# Changelog

## M0 – Scaffold

- Vite + Phaser 4 + TS strict, pnpm, Biome, Vitest, Playwright, knip, prek, cspell, PWA.
- Tooling copied from `../raptor`; GitHub Actions `check.yml` incl. e2e.
- Empty game scene, seeded RNG with tests, smoke e2e test with screenshots.

## M1 – Map and camera

- Seeded 32×24 map: grass, forest/rock/water clusters around a 2×2 keep in the center, edge spawn.
- Procedural tile art, drag pan, pinch and mouse wheel zoom.
- Tests: same seed → same map; 50 seeds have every terrain and a reachable edge spawn.

## M2 – Building and economy

- Woodcutter, quarry, rock pile: placement rules (grass, free tile, next to forest/rock, cost),
  sell for 50 %, tap a building to staff/unstaff it.
- Per-stage payout from staffed buildings. HUD (stage, wood, stone, idle peasants), build bar,
  error toasts, hover preview. Map view sits between HUD and bar.
- Tests for placement, selling, workers, payout; e2e places a rock pile through the UI.

## M3 – Enemies and defense

- Flow-field pathing (forest costs double, rock/water block), raider waves for stages 1–4.
- Idle peasants throw rocks from rock piles (2 per pile, 1 stone per 5 throws); raiders kill
  peasants in melee reach. Win → plunder + next stage, lose → new village.
- Tests: stage 1 with 4 throwers is won (corridor + 5 generated maps), with 0 it is lost.

### M3 fixes

- Rocks fly as projectiles with an arc and deal damage on hit; hit flash, HP bars, throw animation,
  dying enemies fade out.
- Build phase shows the enemy route (dots) and the throw range when placing a rock pile.
