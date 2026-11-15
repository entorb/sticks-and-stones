// Headless battle in Node (no browser): node scripts/sim.ts seed=3 stage=2 piles=2 woodcutters=1 every=50
// Same params as the dev URL (?seed=3&piles=2). every=N prints a text frame every N ticks (0 = result only).

import process from "node:process"
import { TICKS_PER_SEC } from "../src/logic/balance.ts"
import { startWave, stepBattle } from "../src/logic/combat.ts"
import { asciiBattle, scenario } from "../src/logic/scenario.ts"

const q = new URLSearchParams(process.argv.slice(2).join("&"))
const every = Number(q.get("every") ?? 0)
const s = scenario(q)
const b = startWave(s)
if (every > 0) console.log(asciiBattle(s, b))
while (b.result === "running" && b.tick < 100_000) {
  stepBattle(s, b, TICKS_PER_SEC)
  if (every > 0 && b.tick % every === 0) console.log(asciiBattle(s, b))
}
console.log(asciiBattle(s, b))
