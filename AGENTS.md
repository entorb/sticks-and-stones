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
  woodcutters=1 stone=0 palisade=3 every=50` prints text frames (`asciiBattle`: map + units, legend in
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

- Done and committed (`537ed7b`): M0–M4, plus owner changes: 2×2 mayor's hut with a fighting
  mayor, free unit movement, all peasants defend (fetch rocks beside the nearest pile or tower,
  close in, throw; workers also melee with tools; a peasant still holding a rock waits instead of
  walking back), enemies attack all peasants. M4: palisade/gate (stage 5), stone wall/tower
  (stage 10), wall HP/breaking/repair/upgrade, flawless +2 Rep, torchbearer/armored/ram, waves
  1–10 with mini bosses at 5 and 10. See `CHANGELOG.md`, `DECISIONS.md`.
- Economy (owner, other session): no Reputation wave growth any more; arrivals
  `1 + floor(rep / 3)`; rock piles and towers hold `rocks: 25`, refilled each build phase
  (`nextStage`), no stockpile stone per throw; rising build cost +50% per copy (walls flat).
- Parts of M6 already done: Renown (`earnRenown`, `RENOWN`), `CHECKPOINTS` start packages
  (`newGame(seed, map, checkpoint)`), loss refounds at the highest checkpoint, profile saved in
  `localStorage` (`scenes/profile.ts`, versioned `v: 1`), HUD shows Renown.
  Still open for M6: menu scene (continue / new village / choose checkpoint), autosave + load of
  the current village, save migration function, round-trip test, e2e reload mid-run.
- M5 done (uncommitted): pile switching fix, `tests/logic/campaign.test.ts` (build bot survives
  stages 1–10, seeds 1–3), Reputation/arrival tests in `progression.test.ts`. Balance finding for
  the owner: the bot also wins 1–10 **without any walls** and hoards 200+ stone; no peasant dies.
  Walls add nothing yet; waves 6–10 likely need to be harder (owner to decide). `tmp/bot.ts`
  (env `NOWALL=1`, `PP=<peasants per pile>`, `F=<every> ST=<stage>` prints frames) is the dev copy.
- **Next:** owner balance decision, then M6 rest (menu, autosave/load, migration, round trip).
- **Paused by the owner** until the game is up and running: cspell and rewriting old unit tests.
  Current tests: `walls`, `progression`, `campaign` in `tests/logic/` (pass). The
  other files in `tests/logic/` fail (old 1-tile keep layout, `keep` in `helpers.ts`,
  `flowField(map, goal)`, `throwers`). Don't fix them unless asked; when asked, rewrite them
  against the current logic (hut is `MAP.hutSize`² at `map.hut`, `flowField(grid, goals[])`,
  `Battle.peasants`/`mayor`, result `lost` = mayor dead). New features get new test files.
  Before each commit keep lint, typecheck of `src/`, knip, e2e green and run current tests:
  `scripts/chk_js_format.sh && pnpm exec tsc --noEmit | grep -v "^tests/logic"; pnpm exec vitest run tests/logic/walls.test.ts tests/logic/progression.test.ts tests/logic/campaign.test.ts; scripts/chk_js_e2e.sh && scripts/chk_js_dead.sh && scripts/chk_pre-commit.sh`.
- Known gaps (owner may raise): on phones the 2nd build-bar row covers the map bottom; spawns are
  grouped by kind, not interleaved; walled-in peasants stay put; stone walls give +2 range only
  to peasants who happen to stand on them (no wall posts yet).
- Headless Chromium runs ticks slowly: screenshot a battle with `waitForFunction` on
  `scene.getScene("Game").battle.tick >= N`, not a fixed timeout (`tmp/walls-tick.mjs`).
- Owner workflow: plays the dev build, reports issues in short messages, says "continue" for the
  next milestone and "commit" when happy. Review screenshots yourself before reporting. Other
  sessions may change files in parallel: check `git status` / `git diff` before editing.
- Handy debug scripts (gitignored, may be gone): `tmp/walls-shots.mjs`, `tmp/walls-tick.mjs`
  (browser screenshots via dev URL, need `pnpm dev`). Prefer `node scripts/sim.ts …` for battles.

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
  (add new screens to `SCREENS`). Chromium: `pnpm exec playwright install --only-shell chromium` (headless shell only, never other browsers).
- Deploy: `scripts/deploy.sh` (checks, build, rsync to `html/sticks-and-stones/`; vite `base` is
  `/sticks-and-stones/`).
- SonarCloud: `scripts/get_sonar_issues.sh` refreshes `tmp/sonar.json`. Avoid up front: nested
  template literals, nested ternaries, comma operator in arrows, `void` on non-Promise, cognitive
  complexity > 15 (split into helpers), `for (let i...)` over simple iteration (use `for-of`),
  > 7 function params (options object), consecutive `push()` calls, `await` in loops, `TODO` comments.
- Biome (`scripts/chk_js_format.sh`; `×` errors fail, `!` warnings must not grow, `i` infos are
  tolerated in existing code). Avoid up front:
  - cognitive complexity > 15 (error): split a loop body into a helper (`peasantMoves` pattern).
  - > 4 function params (`useMaxParams`): pass an options object or the owner (`b: Battle`).
  - `noUnnecessaryConditions`: no `?? fallback` / `?.` on values the types say are defined.
  - `noShadow`: don't reuse an outer name for a callback param (`b` vs `b: Battle`, `s`).
  - In new code prefer `+= 1` over `++`, `if` blocks over `continue`, destructuring
    (`const { x } = p`), `.at(-1)` over `[a.length - 1]`.
- TS `lib` is ES2020: no `toSorted`, `findLast`, `Object.groupBy`; use `[...a].sort()` etc.
- Keep these lists current: when a Biome, tsc or Sonar finding not listed here costs a fix
  round, add a one-line "avoid up front" rule for it in the same session.

## Layout

- `src/main.ts`: Phaser config (`Scale.RESIZE`, portrait + landscape), dev `globalThis.__game`.
- `src/scenes/`: `BootScene` (builds textures) → `GameScene` (map, buildings, taps) + `UIScene`
  (HUD top, build bar bottom, toasts; restarts on resize). They share `GameState` and the selected
  tool via `registry` (`shared.ts` `REG`) and signal via `game.events` (`EV.changed`, `EV.toast`, `EV.defend`; `REG.battle` = running battle or null).
  Interactive UI panels block taps to the map (Phaser `globalTopOnly`).
  Defend! → `GameScene` runs the battle in fixed ticks (`TICKS_PER_SEC`) in `update()`;
  `battleView.ts` draws all units by id (interpolated `px/py` → `x/y`, HP bars) and rocks
  (`Battle.rocks`, arc). Build phase: dotted enemy route + rock pile range circle.
  `profile.ts`: mayor profile load/save (`localStorage`). `textures.ts`: procedural art (`TILE_PX`, texture keys; hut 64 px, mayor drawn at the door). `cameraControls.ts`: viewport between
  the UI bars (`HUD_H`, `BAR_H`), drag pan, pinch + wheel zoom, tap callback (`TAP_SLOP`).
- `src/logic/`: `balance.ts` (`MAP`, `WALK_SPEED`, `BUILDINGS` (walls have `hp`), `UPGRADE`,
  `REPAIR_HP`, `TOWER_HOLDS`, `WALL_PATH_COST`, `FIRE_DAMAGE`, `CHECKPOINTS`, `RENOWN`, `COST_GROWTH`, `REPUTATION`,
  `TICKS_PER_SEC`, `ENEMIES`, `ENEMY_AGGRO`, `MAYOR`, `PEASANT`, `WAVES`,
  ), `rng.ts`,
  `types.ts`, `map.ts` (`generateMap`, `hutCenter`, `hutTiles`, `isHut`), `state.ts` (`newGame`, `idlePeasants`), `building.ts`
  (`buildCost`, `placeError`, `placeBuilding`, `toggleWorkers`), `economy.ts` (`payout`),
  `progression.ts` (`nextStage` refills piles, `earnRenown`; `combat.ts` `winStage` adds kill loot, Reputation, arrivals), `pathing.ts` (`flowField(grid, goals[])` 8-dir Dijkstra,
  `nextTile`, `lineWalkable`, `waypoint` = straight-line shortcut; all take a `Grid` = map + wall
  `costs`, Infinity blocks), `walls.ts` (`wallGrid(s, side)`, `walkGrids` → `Battle.grid`,
  `peasantGrid`, `field`; `hitWall`, `repairWall`, `material`), `waves.ts` (`spawnSchedule`), `scenario.ts` (dev: `scenario(params)`, `asciiBattle`),
  `battle.ts` (unit types `Enemy`/`Peasant`/mayor `Unit` with id 0, `moveToward`, `strike`,
  `reach` = melee distance, mayor counted from the hut wall), `defenders.ts`
  (all peasants fetch rocks at the nearest pile and throw, rocks, mayor), `combat.ts` (`startWave`, `stepBattle` = enemies,
  `simulateWave`, `winStage`).
- `tests/logic/` (Vitest, `vitest.config.ts`; `helpers.ts` `stateFrom(rows)` builds a state from an
  ASCII map), `tests/e2e/` (Playwright, `playwright.config.ts`,
  runs against `pnpm build && pnpm preview`, desktop + 375×667 phone).
