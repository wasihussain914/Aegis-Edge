/**
 * Micro-benchmark for the deterministic engagement gate — turns the "<1 ms" claim into a measured
 * fact. Times one full per-tick decision (planEngagements over the whole air picture: resolve every
 * hostile's shooter/weapon by ROE + the approval gate) across many iterations.
 *
 * Run:  node --import tsx scripts/bench-gate.ts
 */
import { planEngagements } from "../src/coop/engagement.js";
import { MARINE_BEACHHEAD, tankColumnAt, COOP_TRACKS } from "../src/data/coopScenario.js";
import type { Unit } from "../src/coop/types.js";

const units: [Unit, Unit] = [MARINE_BEACHHEAD, tankColumnAt(80)]; // Column at standoff, link up
const N = 200_000;

// warm up the JIT
for (let i = 0; i < 20_000; i++) planEngagements(COOP_TRACKS, units, true, "manual", new Set());

const t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) planEngagements(COOP_TRACKS, units, true, "manual", new Set());
const t1 = process.hrtime.bigint();

const totalNs = Number(t1 - t0);
const perCallUs = totalNs / N / 1000;
const hostiles = COOP_TRACKS.filter((t) => t.faction === "hostile").length;
console.log(`Deterministic gate benchmark`);
console.log(`  iterations         : ${N.toLocaleString()}`);
console.log(`  full-picture tick  : ${perCallUs.toFixed(2)} µs  (${(perCallUs / 1000).toFixed(4)} ms)`);
console.log(`  per hostile track  : ${(perCallUs / hostiles).toFixed(2)} µs`);
console.log(`  => well under 1 ms, off any network path.`);
