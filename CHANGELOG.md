# Changelog

## M0 – Scaffold

- Vite + Phaser 4 + TS strict, pnpm, Biome, Vitest, Playwright, knip, prek, cspell, PWA.
- Tooling copied from `../raptor`; GitHub Actions `check.yml` incl. e2e.
- Empty game scene, seeded RNG with tests, smoke e2e test with screenshots.

## M1 – Map and camera

- Seeded 32×24 map: grass, forest/rock/water clusters around a 2×2 keep in the center, edge spawn.
- Procedural tile art, drag pan, pinch and mouse wheel zoom.
- Tests: same seed → same map; 50 seeds have every terrain and a reachable edge spawn.
