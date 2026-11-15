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

## M4 Walls and stages 1–10

- Palisade and gate (stage 5), stone wall and tower (stage 10). Walls have HP, block enemies and
  show an HP bar when damaged. Enemies walk around walls when the detour is short, else break
  through; the build phase route preview shows it.
- Gates let peasants through; stone walls (+2) and towers (+3, 3 defenders) extend throw range.
- Upgrade: build a stone wall on a palisade (8 stone). Repair: tap a damaged wall.
- Flawless win (walls untouched) gives +2 Reputation.
- New enemies: torchbearer (fast, burns wood), armored bandit, ram (wall breaker). Waves for
  stages 1–10 with mini bosses at 5 (mob) and 10 (rams).
- Build bar shows unlocked buildings only and wraps into two rows on phones.
- Dev: `palisade=r` / `stoneWall=r` params build a wall ring around the hut.

## Economy rework, roguelike mayor

- Rock piles and towers hold 25 rocks, refilled free each build phase; empty piles are drawn
  faded. Stone is only for building.
- Loot per kill (raider 1 wood + 1 stone, torchbearer 2 wood, armored 1 wood + 2 stone, ram 10
  stone) replaces flat plunder.
- Waves scale by stage only; arrivals `1 + floor(reputation / 3)`.
- The mayor keeps Renown (saved); a lost village is refounded at the highest checkpoint, its
  Reputation is lost. HUD shows Renown and wraps to two lines on phones.
- Selling buildings removed.

## M5 – Reputation and peasants

- Peasants at an empty rock pile switch to the nearest reachable pile or tower with rocks
  (before, every idle peasant crowded the pile nearest the hut and stood still once it was empty).
- Tests for Reputation (win, flawless), arrivals and pile switching; campaign test: a scripted
  build (piles, woodcutters/quarries, palisade ring at 5, stone ring + towers at 10) survives
  stages 1–10 on seeds 1–3.

## M6 – Mayor, Renown, checkpoints, saving

- Start menu: continue the autosaved village or found a new one at any reached checkpoint; shows
  Renown.
- The village autosaves in the build phase (after each build/tap and each won stage) as versioned
  JSON (`logic/save.ts`, migration table for future formats); a lost village deletes the save.
- Tests: save round trip, broken/newer saves; e2e reloads mid-run and continues.

## M7 – Mobile polish and PWA

- Battle speed toggle (1×/2×/4×) on the Defend! button while a battle runs.
- Picking a build tool shows a one-line hint; toasts wrap on narrow screens.
- Map view stays above the build bar when it wraps into two rows (phones, stage 5+).
- "Install as app" link in the menu when the browser offers install; service worker updates
  itself on the next load.
- E2E: menu button counts include the Rock piles advance.

## Fun pass

- Each wave comes from a random point on the map edge; marker and dotted route show where.
- Half of the fallen peasants (rounded up) recover after a won stage.
- Rock piles and towers hold 15 rocks; wave 5 is 18 raiders, slower; first pile advance 5 Renown.
- A lost village goes back to the menu, where Renown buys advances.
