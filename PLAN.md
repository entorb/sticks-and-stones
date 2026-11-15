# Castle Defense Game – Plan for a Vibe Coding Agent

A browser and mobile game: build a medieval village and defend it, wave by wave.
Tower defense + light city building + roguelike progression, inspired by Stronghold.

The owner does **not** review code in detail. Correctness is ensured by types, tests and automated checks.
**You are responsible for keeping all checks green.**

---

## 1. Tech stack (fixed)

- **Phaser 4** + **TypeScript (strict)** + **Vite**
- **pnpm** as package manager
- **Biome** for lint and format
- **Vitest** for unit tests of the game logic
- **Playwright** for smoke tests (game loads, no console errors, screenshot)
- **vite-plugin-pwa** for an installable, offline-capable PWA
- Saves in `localStorage`, no backend
- Static build, deployed to a plain web host
- License: **GPL-3.0**
- Free placeholder art: Kenney.nl (CC0), credited in `CREDITS.md`

Do not add other frameworks (no React/Vue, no second rendering library). All UI is built in Phaser.

## 2. Architecture rules

```text
src/
  logic/        # pure TypeScript, NO Phaser imports – all game rules
    balance.ts  # ALL numbers (costs, HP, damage, wave sizes) – single source of truth
    types.ts
    state.ts    # GameState: grid, resources, peasants, buildings, enemies, reputation
    economy.ts
    building.ts
    pathing.ts  # flow field toward the keep
    combat.ts
    waves.ts    # wave generation per stage + reputation
    progression.ts  # stages, checkpoints, mayor, renown
    save.ts
  scenes/       # Phaser scenes – rendering + input only, call into logic/
    BootScene.ts
    MenuScene.ts
    GameScene.ts
    UIScene.ts  # HUD, build bar, dialogs (runs parallel to GameScene)
  main.ts
tests/
  logic/        # Vitest, one file per logic module
  e2e/          # Playwright smoke tests
```

- **Logic is deterministic.** Use a seeded RNG (pass the seed in, never `Math.random()` in `logic/`).
- **Simulation runs in fixed ticks** (e.g. 10 ticks/s). Rendering interpolates. This keeps logic testable.
- **Scenes never contain game rules.** They read `GameState` and send commands (`placeBuilding`, `startWave`, …).
- **No magic numbers outside `balance.ts`.**
- Keep files small (< 300 lines). Split when they grow.

## 3. Quality gates (must pass before every commit)

```text
pnpm typecheck   # tsc --noEmit, strict
pnpm lint        # biome check
pnpm test        # vitest run
pnpm e2e         # playwright: loads game, starts stage 1, no console errors
pnpm build
```

- Set these up as pre-commit hooks and in a GitHub Actions workflow.
- Every new logic feature gets unit tests. Every milestone gets at least one test that simulates it end-to-end in `logic/` (for example "stage 1 with 4 rock-throwers is won").
- After each milestone, take a Playwright screenshot of the game, look at it and fix obvious visual problems.

Keep a `CLAUDE.md` / `AGENTS.md` in the repo with these rules and the commands.

---

## 4. Game design

### Core loop

1. **Build phase** (no timer): place buildings, assign peasants, repair walls. Press "Defend!" to start.
2. **Defense phase:** one wave of enemies attacks from the map edges and paths toward the keep.
3. **Result:**
   - **Win** → plunder (wood + stone), Reputation +1 (flawless = no wall damage: +2), new peasants arrive, next stage.
   - **Lose** (an enemy reaches the keep) → **the village is lost.** The mayor keeps the Renown earned and founds a new village at the highest checkpoint reached.

### Acts and stages

- An act has **20 stages**. One stage = one wave.
- Mini bosses at stages **5, 10, 15**, act boss at **20**.
- Beating stage 20 unlocks the next act. The player chooses when to move on and can always go back.
- Acts (content later): 1 Bandits → 2 Feudal army → 3 Undead → 4 Fantasy.

Act 1 difficulty curve:

| Stages | Threat | Intended answer |
|---|---|---|
| 1–4 | A few peasant raiders | Rock-throwers |
| 5 | Mini boss: large mob | Palisade |
| 6–9 | Torchbearers (fast, extra damage to wood), armored bandits | Palisade + more throwers |
| 10 | Mini boss: battering ram (huge damage to walls) | Stone wall |
| 11–14 | Bandit archers (shoot defenders) | Defenders on walls |
| 15 | Mini boss: bandit captain + elites | Arrows |
| 16–19 | Mixed, dense | Everything |
| 20 | Act boss | Full build |

After each mini boss, the next stage is slightly easier (a breather).

### Map

- Tile grid, top-down or simple isometric (start top-down, it's easier), e.g. 32×24 tiles.
- Keep in the center. Enemies spawn from 1–3 marked edge points (more spawn points in later stages).
- Terrain: grass (buildable), forest (woodcutters must be adjacent, 50% walk speed), rock (quarries must be adjacent, blocks movement), water (blocks everything).
- Maps are generated from a seed.

### Resources

- **Wood** and **stone** only (in-run). No gold, food or iron in Act 1.
- Production is paid out **once per stage** (at the start of the build phase), not continuously. This keeps the economy simple and readable.

### Peasants

- New peasants **arrive automatically** each stage: `1 + floor(reputation / 2)`.
- Each peasant is either **assigned to a work building** or **idle**.
- **Idle peasants defend automatically:** in the defense phase they go to the nearest rock pile and throw rocks.
- Peasants on a stone wall get bonus range. Enemies can kill peasants.
- Core tension: workers grow the economy, idle peasants defend.

### Reputation (in-run)

- Starts at 0 in every new village.
- Win +1, flawless win +2. (Defeat ends the village, so there is no penalty case.)
- Effects: more arriving peasants (see above) **and** larger waves: `enemyCount = base(stage) × (1 + 0.10 × reputation)`.
- Shown in the HUD as a banner icon with its value.
- Balance rule: one point of Reputation must give more defensive value (peasants) than it adds in enemies.

### Buildings (Act 1)

| Building | Cost | Unlock | Effect |
|---|---|---|---|
| Keep | – | Start | Lose if an enemy reaches it |
| Woodcutter | 10 wood | Start | +15 wood/stage, 1 worker, next to forest |
| Quarry | 15 wood | Start | +10 stone/stage, 1 worker, next to rock |
| Rock pile | 5 stone | Start | Defense spot. Throwers use 1 stone per 5 throws from the stockpile |
| Palisade (1 tile) | 5 wood | Stage 5 | 40 HP, blocks enemies, takes double damage from fire |
| Palisade gate | 15 wood | Stage 5 | Like palisade, peasants can pass |
| Stone wall (1 tile) | 10 stone | Stage 10 | 150 HP, peasants can stand on it (+2 range) |
| Upgrade palisade → stone | 8 stone | Stage 10 | In place |
| Corner tower | 30 stone | Stage 10 | Holds 3 defenders, +3 range |
| Fletcher | 40 wood | Stage 15 | Train archers: 1 peasant + 10 wood. Archers have long range, don't work |

- Wall repair in the build phase: 1 wood or stone per 10 HP.
- Selling a building refunds 50%.

### Enemy pathing

- Use a **flow field** (BFS/Dijkstra from the keep over the grid). Recompute it when buildings change.
- Walls are **passable with high cost**: enemies prefer going around, but if there's no path (or the detour is too long) they walk up to the wall and attack it until it breaks.
- Water is impassable.

### Combat (keep it simple)

- Units have HP, damage, attack speed and range. Projectiles (rocks, arrows) are visual. Damage is applied on hit.
- Throwers target the nearest enemy in range.
- Enemy types in Act 1 (stats in `balance.ts`): raider, torchbearer, armored bandit, bandit archer, ram, captain.

### Mayor and Renown (permanent)

- The **mayor** is the persistent player profile. They earn **Renown**:
  - per stage won: `stage × 1`
  - bonus for reaching a new checkpoint for the first time: +20
- **Checkpoints** at stages 1, 6, 11, 16. A new village starts at the highest checkpoint reached (the player can choose a lower one) with a baseline package:

| Start at | Wood | Stone | Peasants | Unlocked |
|---|---|---|---|---|
| 1 | 50 | 20 | 4 | rocks |
| 6 | 120 | 60 | 8 | + palisade |
| 11 | 200 | 150 | 12 | + stone wall, tower |
| 16 | 300 | 250 | 16 | + fletcher |

- **Renown upgrades** (post-MVP): three branches with 4–5 levels each.
  - Economy: +starting resources, +1 starting peasant, +10% production
  - Defense: +rock damage, +wall HP, cheaper repairs
  - Options: card reroll, 4 cards to choose from instead of 3, extra buildings
  - Prefer new options over raw stat boosts so farming early stages doesn't trivialize later ones.

### Cards (post-MVP)

- After every **win**, pick 1 of 3 random cards. Cards last for the current village.
- Purpose: variety between runs, reward for winning, build synergies.
- Examples: "Woodcutters +50%", "Rocks +1 damage", "Palisade 2× HP", "Walls self-repair between stages", "+50% plunder, next stage harder", "Hide in the forest: Reputation −2, next wave small".
- Card definitions are data (a list in `logic/cards.ts`), with effects as modifiers on `balance` values.

### Controls (touch-first)

- Tap: select / place. Drag: pan. Pinch / mouse wheel: zoom. Long press / hover: info tooltip.
- Build bar at the bottom, resources + Reputation + stage at the top.
- Defense phase: pause and 1×/2× speed buttons.
- Works in portrait and landscape. Minimum target: a phone at 375×667.

### Saving

- Autosave the mayor profile (Renown, checkpoints, upgrades, settings) and the current village after every stage.
- Versioned save format with a migration function.

---

## 5. MVP scope

**In:** Act 1, stages 1–10, rocks, palisade, stone wall, corner tower, woodcutter, quarry, peasants, Reputation, flow-field pathing, wall breaking, mini bosses at 5 and 10, defeat → new village at checkpoint, Renown counter, saving, PWA, touch controls.

**Out (later):** stages 11–20, arrows/fletcher, cards, Renown upgrade tree, acts 2–4, sound, isometric art, online features.

---

## 6. Milestones

Work through these in order. Each ends with all quality gates green, a commit and a short note in `CHANGELOG.md`.

**M0 – Scaffold**
Vite + Phaser + TS strict, pnpm, Biome, Vitest, Playwright, pre-commit, GitHub Actions, PWA plugin, `CLAUDE.md`.
✅ Empty game scene renders. All checks green in CI.

**M1 – Map and camera**
Seeded map generation, tile rendering, pan/zoom (touch + mouse), keep in the center.
✅ Unit test: same seed → same map. Screenshot shows the map.

**M2 – Building and economy**
Build bar, placement rules (terrain, cost, occupied), woodcutter, quarry, worker assignment, per-stage payout, HUD.
✅ Tests for placement rules and payout.

**M3 – Enemies and defense**
Flow field, enemy spawning and movement, rock piles, idle peasants throwing rocks, enemy and peasant death, win/lose detection.
✅ Logic test: stage 1 with 4 throwers is won. Stage 1 with 0 throwers is lost.

**M4 – Walls and stages 1–10**
Palisade, gate, stone wall, upgrade, tower, wall HP and breaking, repairs, unlocks by stage, wave definitions for stages 1–10 incl. torchbearer, armored bandit and ram, mini bosses at 5 and 10.
✅ Test: enemies path around walls when possible and attack them when not. Test: the ram breaks a palisade quickly.

**M5 – Reputation and peasants**
Reputation gain, peasant arrivals, wave scaling.
✅ Tests for the formulas. Simulation: a sensible scripted build survives stages 1–10 at least once.

**M6 – Mayor, Renown, checkpoints, saving**
Menu scene (continue / new village / choose checkpoint), Renown earnings, baseline packages, autosave + load, save versioning.
✅ Test: save → load round trip gives identical state. E2E: reload the page mid-run and continue.

**M7 – Mobile polish and PWA**
Responsive HUD, portrait/landscape, speed controls, tooltips, install prompt, offline.
✅ Playwright screenshots at phone and desktop sizes look correct. Lighthouse PWA check passes.

**Then:** cards → Renown upgrade tree → stages 11–20 + arrows → act 2.

---

## 7. Working agreements for the agent

- Read this plan and `CLAUDE.md` at the start of each session.
- Make small commits, one feature at a time.
- If a design detail is missing, choose the simplest option that fits this plan, note it in `DECISIONS.md` and carry on. Don't stop to ask unless the choice is hard to reverse.
- Balance changes only in `balance.ts`. Explain them in the commit message.
- Never disable a check, lower strictness or skip tests to get green. Fix the cause.
- Keep dependencies minimal. Pin versions and commit the lockfile.
