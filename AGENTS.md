# Sticks & Stones: Defend the Village

Browser/mobile tower defense + light city building, see [PLAN.md](PLAN.md) (design, milestones).
Tech stack: Phaser 4, Vite 8, TypeScript strict, pnpm, Vitest, Playwright, Biome, knip,
vite-plugin-pwa. Template/sister project: `../raptor` (same tooling).

## Instructions

- Read PLAN.md and this file at the start of each session. Work milestone by milestone.
- Use context7 for current Phaser 4 APIs (most web examples are Phaser 3). Use American English.
- Missing design detail: pick the simplest option that fits PLAN.md, note it in `DECISIONS.md`.
- Each milestone: entry in `CHANGELOG.md`, all checks green, screenshot reviewed.
- Put debugging scripts in `./tmp/` (gitignored), not `/tmp/`.
- Update this file after research or when a gotcha cost time.
- Git commits: subject line only (`<type>: <Description>`), never a Claude `Co-Authored-By` trailer.

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
  tool via `registry` (`shared.ts` `REG`) and signal via `game.events` (`EV.changed`, `EV.toast`).
  Interactive UI panels block taps to the map (Phaser `globalTopOnly`).
  Defend! → `GameScene` runs the battle in fixed ticks (`TICKS_PER_SEC`) in `update()`;
  `battleView.ts` draws enemies (interpolated `px/py` → `x/y`), throwers and flying rocks.
  `textures.ts`: procedural art (`TILE_PX`, texture keys). `cameraControls.ts`: viewport between
  the UI bars (`HUD_H`, `BAR_H`), drag pan, pinch + wheel zoom, tap callback (`TAP_SLOP`).
- `src/logic/`: `balance.ts` (`MAP`, `WALK_SPEED`, `START`, `BUILDINGS`, `SELL_REFUND`), `rng.ts`,
  `types.ts`, `map.ts` (`generateMap`), `state.ts` (`newGame`, `idlePeasants`), `building.ts`
  (`placeError`, `placeBuilding`, `sellBuilding`, `toggleWorkers`), `economy.ts` (`payout`),
  `progression.ts` (`nextStage`), `pathing.ts` (`flowField` Dijkstra to the keep, `nextTile`),
  `waves.ts` (`spawnSchedule`), `combat.ts` (`startWave`, `stepBattle`, `simulateWave`, `winStage`).
- `tests/logic/` (Vitest, `vitest.config.ts`; `helpers.ts` `stateFrom(rows)` builds a state from an
  ASCII map), `tests/e2e/` (Playwright, `playwright.config.ts`,
  runs against `pnpm build && pnpm preview`, desktop + 375×667 phone).
