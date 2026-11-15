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

## Mayor's hut and free movement

- The keep is replaced by a 2×2 hut with the mayor (25 HP), who fights enemies in melee; the
  village is lost when the mayor dies. HUD shows the mayor's HP.
- Units move freely (8 directions + straight-line shortcuts); throwers walk from the hut to their
  rock pile; workers stand at their buildings.
- Enemies attack any peasant or the mayor near them.
- Unit tests and cspell not yet updated for these changes (paused on request).

## All peasants defend

- Workers (woodcutters, quarry workers) join the defense too; no more 2-thrower slot limit per pile.
- Peasants fetch rocks: walk next to the nearest pile (not onto it), pick up a rock, close in on
  enemies near the pile if needed, throw, return for the next rock.
- Woodcutters and quarry workers hit with their tools when an enemy is in melee range, and charge
  nearby enemies when no stone is left.

## Dev tools

- `node scripts/sim.ts seed=… piles=… every=…`: headless battle in Node with text frames.
- Dev URL params `?seed&stage&peasants&piles&woodcutters&quarries&wood&stone&speed&defend`.

## Economy

- Reputation (HUD "Rep"): +1 per won stage; `1 + floor(reputation / 2)` new peasants arrive per
  won stage; waves grow 10% per point.
- Rocks cost 1 stone per 2 throws (was 5).
- Each extra building of a type costs 50% more of its base cost; build bar shows the current price.
