# Sticks & Stones: Defend the Village

Browser/mobile tower defense + light city building, see [PLAN.md](PLAN.md) (design, milestones).
Tech stack: Phaser 4, Vite 8, TypeScript strict, pnpm, Vitest, Playwright, Biome, knip,
vite-plugin-pwa. Template/sister project: `../raptor` (same tooling).

## Instructions

- Read PLAN.md and this file at the start of each session. Work milestone by milestone.
- Use context7 for current Phaser 4 APIs (most web examples are Phaser 3). Use American English.
- Missing design detail: pick the simplest option that fits PLAN.md, note it in `DECISIONS.md`.
- Each milestone: entry in `CHANGELOG.md`, all checks green, screenshot reviewed.
- Debug logic headless first (0.1 s, no browser): `node scripts/sim.ts seed=3 piles=2
  woodcutters=1 stone=0 every=50` prints text frames (`asciiBattle`: map + units, legend in
  `logic/scenario.ts`). Node runs `.ts` natively; own scripts in `tmp/*.ts` import `../src/logic/*.ts`.
  Same params as dev URL: `?seed=3&piles=2&speed=5&defend` (`speed` = tick multiplier, `defend` =
  start the wave at once). Use screenshots only for visuals.
- Put debugging scripts in `./tmp/` (gitignored), not `/tmp/`. Debug in the browser: `pnpm dev`, then
  Playwright `page.evaluate` on `globalThis.__game` (e.g. `scene.getScene("Game").state`); logic
  modules import as `/sticks-and-stones/logic/<module>.ts`. Stop the dev server with
  `pgrep -f "[v]ite/config.dev" | xargs -r kill` (the brackets keep it from killing the shell).
- Update this file after research or when a gotcha cost time.
- Git commits: subject line only (`<type>: <Description>`), never a Claude `Co-Authored-By` trailer.

## Current status (update at the end of each session)

- Done: M0 scaffold, M1 map + camera, M2 buildings + economy, M3 enemies + defense, plus owner
  changes on top of M3: 2×2 mayor's hut with a fighting mayor (replaces the keep), free unit
  movement, enemies attack all peasants (workers, idle peasants, mayor); all peasants defend
  (fetch rocks beside the nearest pile, close in, throw; workers also melee with tools); economy
  spec (Reputation + arrivals, waves +10%/rep, ammo 1 stone per 2 rocks, rising build cost +50%
  per copy); dev tools (`scripts/sim.ts`, dev URL params). See `CHANGELOG.md`, `DECISIONS.md`.
- Uncommitted at handover: everything since `bd6aec5` (all-peasants defense, tool melee, dev
  tools, economy). Ask the owner before committing.
- Open balance questions (owner to decide, see last economy projection): stone runs dry stages 2–7
  (options: quarry +15, or 1 stone per 3 rocks); peasants snowball (44 vs 25 enemies at stage 12;
  M4 waves must outgrow arrivals, or arrivals `floor(rep / 3)`); wood surplus is for M4 walls.
- **Paused by the owner** until the game is up and running: unit tests and cspell. 17 tests in
  `tests/logic/` fail because they still assume the old 1-tile/keep layout, 4-direction pathing
  and `flowField(map, goal)` / `throwers` APIs. Don't fix them unless asked; when asked, rewrite
  them against the current logic (hut is `MAP.hutSize`² at `map.hut`, `flowField(map, goals[])`,
  `Battle.peasants`/`mayor`, result `lost` = mayor dead). Still keep lint, typecheck of `src/`,
  knip and e2e green before each commit:
  `scripts/chk_js_format.sh && pnpm exec tsc --noEmit | grep -v "^tests/logic"; scripts/chk_js_e2e.sh && scripts/chk_js_dead.sh && scripts/chk_pre-commit.sh`.
- Next: M4 (walls, flawless win = +2 Reputation once walls exist, gate, stone wall, tower, wall HP/breaking, repairs, unlocks, stages 1–10 with
  torchbearer, armored bandit, ram, mini bosses at 5 and 10). Walls must block units, so free
  movement (`waypoint`/`lineWalkable`) and enemy targeting need to treat walls as obstacles with
  high flow-field cost and as attack targets.
- Owner workflow: plays the dev build, reports issues in short messages, says "continue" for the
  next milestone and "commit" when happy. Review screenshots yourself before reporting.
- Handy debug scripts (gitignored, may be gone): `tmp/econ.ts <seed>` (Node, 12-stage economy
  projection with a simple build bot), `tmp/debug-shots.mjs` (browser screenshots of a wave, needs
  `pnpm dev`). Prefer `node scripts/sim.ts …` for battles.

## Architecture rules

- `src/logic/`: pure TS, **no Phaser imports**, all game rules. Deterministic: use
  `createRng(seed)` from `logic/rng.ts`, never `Math.random()`. Fixed ticks (10/s).
- `src/logic/balance.ts`: **all** numbers (costs, HP, damage, wave sizes). No magic numbers elsewhere.
  Balance changes only there, explained in the commit message.
- `src/scenes/`: rendering + input only; read `GameState`, send commands to `logic/`.
- Files < 300 lines. Every logic feature gets a test in `tests/logic/<module>.test.ts`.
- Never disable a check, lower strictness or skip tests to get green. Fix the cause.
- Keep dependencies minimal, pinned, lockfile committed.

## Commands

- `pnpm dev` (<http://localhost:5173/sticks-and-stones/>), `pnpm build`, `pnpm preview` (port 4173)
- Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `pnpm build`
- After each task: `scripts/chk_js_format.sh`; after each feature: `scripts/run_checks.sh`
  (biome, tsc, knip, vitest, playwright e2e, audit, prek). Spelling: `scripts/run_spelling.sh`
  (add intentional words to `cspell-words.txt`).
- Screenshots: `pnpm e2e` writes `tmp/screens/smoke-{desktop,phone}.png`. With `pnpm dev`
  running, `node scripts/gen_screen_exports.mjs` writes PNG + text/hit-target snapshot per screen
  (add new screens to `SCREENS`). Chromium: `pnpm exec playwright install chromium`.
- Deploy: `scripts/deploy.sh` (checks, build, rsync to `html/sticks-and-stones/`; vite `base` is
  `/sticks-and-stones/`).
- SonarCloud: `scripts/get_sonar_issues.sh` refreshes `tmp/sonar.json`. Avoid up front: nested
  template literals, nested ternaries, comma operator in arrows, `void` on non-Promise, cognitive
  complexity > 15 (split into helpers), `for (let i...)` over simple iteration (use `for-of`),
  > 7 function params (options object), consecutive `push()` calls, `await` in loops, `TODO` comments.

## Layout

- `src/main.ts`: Phaser config (`Scale.RESIZE`, portrait + landscape), dev `globalThis.__game`.
- `src/scenes/`: `BootScene` (builds textures) → `GameScene` (map, buildings, taps) + `UIScene`
  (HUD top, build bar bottom, toasts; restarts on resize). They share `GameState` and the selected
  tool via `registry` (`shared.ts` `REG`) and signal via `game.events` (`EV.changed`, `EV.toast`, `EV.defend`; `REG.battle` = running battle or null).
  Interactive UI panels block taps to the map (Phaser `globalTopOnly`).
  Defend! → `GameScene` runs the battle in fixed ticks (`TICKS_PER_SEC`) in `update()`;
  `battleView.ts` draws all units by id (interpolated `px/py` → `x/y`, HP bars) and rocks
  (`Battle.rocks`, arc). Build phase: dotted enemy route + rock pile range circle.
  `textures.ts`: procedural art (`TILE_PX`, texture keys; hut 64 px, mayor drawn at the door). `cameraControls.ts`: viewport between
  the UI bars (`HUD_H`, `BAR_H`), drag pan, pinch + wheel zoom, tap callback (`TAP_SLOP`).
- `src/logic/`: `balance.ts` (`MAP`, `WALK_SPEED`, `START`, `BUILDINGS`, `COST_GROWTH`, `REPUTATION`, `SELL_REFUND`,
  `TICKS_PER_SEC`, `ENEMIES`, `ENEMY_AGGRO`, `MAYOR`, `PEASANT`, `WAVES`,
  `PLUNDER`), `rng.ts`,
  `types.ts`, `map.ts` (`generateMap`, `hutCenter`, `hutTiles`, `isHut`), `state.ts` (`newGame`, `idlePeasants`), `building.ts`
  (`buildCost`, `placeError`, `placeBuilding`, `sellBuilding`, `toggleWorkers`), `economy.ts` (`payout`),
  `progression.ts` (`nextStage`; `combat.ts` `winStage` adds plunder, Reputation, arrivals), `pathing.ts` (`flowField(map, goals[])` 8-dir Dijkstra,
  `nextTile`, `lineWalkable`, `waypoint` = straight-line shortcut), `waves.ts` (`spawnSchedule`), `scenario.ts` (dev: `scenario(params)`, `asciiBattle`),
  `battle.ts` (unit types `Enemy`/`Peasant`/mayor `Unit` with id 0, `moveToward`, `strike`,
  `reach` = melee distance, mayor counted from the hut wall), `defenders.ts`
  (all peasants fetch rocks at the nearest pile and throw, rocks, mayor), `combat.ts` (`startWave`, `stepBattle` = enemies,
  `simulateWave`, `winStage`).
- `tests/logic/` (Vitest, `vitest.config.ts`; `helpers.ts` `stateFrom(rows)` builds a state from an
  ASCII map), `tests/e2e/` (Playwright, `playwright.config.ts`,
  runs against `pnpm build && pnpm preview`, desktop + 375×667 phone).
