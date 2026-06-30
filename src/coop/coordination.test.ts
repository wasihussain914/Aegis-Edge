import { test } from "node:test";
import assert from "node:assert/strict";
import {
  unitSees, airPicture, linkUp, commsAvailable, selectShooter, resolveEngagement, hasHumanSeat,
  approvalGate, commsHealth,
} from "./coordination.js";
import type { Unit, Track } from "./types.js";

const beachhead: Unit = {
  id: "beachhead", name: "Marine Beachhead", pos: { x: 0, z: 0 }, mobile: false,
  radarRangeM: 500, eoirRangeM: 350,
  weapons: [{ type: "shorad", rangeM: 400 }, { type: "rf_zapper", rangeM: 250 }],
};
const column: Unit = {
  id: "tank_column", name: "Army Tank Column", pos: { x: 800, z: 0 }, mobile: true,
  radarRangeM: 200, eoirRangeM: 300,
  weapons: [{ type: "slamraam", rangeM: 600 }, { type: "rf_zapper", rangeM: 250 }],
};
const hostile = (id: string, x: number): Track => ({ id, pos: { x, z: 0 }, faction: "hostile", threat: "HIGH" });

const T_far = hostile("T_far", 450);   // beachhead sees (450<=500), column blind (350> r200/eo300); only column's SLAMRAAM reaches
const T_mid = hostile("T_mid", 300);   // beachhead SHORAD(400) reaches, column SLAMRAAM(600) reaches -> cheapest = SLAMRAAM (column)
const T_close = hostile("T_close", 120); // beachhead RF Zapper(250) reaches -> cheapest weapon overall

test("DOD-3: out of range the air pictures differ", () => {
  assert.equal(unitSees(beachhead, T_far), true);
  assert.equal(unitSees(column, T_far), false);
  assert.deepEqual(airPicture(column, beachhead, [T_far], false).map((t) => t.id), []); // column blind, no link
});

test("DOD-5: on link-up tracks fuse (union)", () => {
  const fused = airPicture(column, beachhead, [T_far], true).map((t) => t.id);
  assert.deepEqual(fused, ["T_far"]); // column now sees beachhead's track
});

test("DOD-7: ROE picks the cheapest in-range weapon across units (non-primary detector shoots)", () => {
  // T_mid: beachhead -> SHORAD(cost2), column -> SLAMRAAM(cost1). Cheapest wins => column.
  const pick = selectShooter(T_mid, [beachhead, column], true, new Set());
  assert.deepEqual(pick, { shooter: "tank_column", weapon: "slamraam" });
  // T_far: beachhead detects but has NO in-range weapon; only the column (via link) can engage.
  assert.deepEqual(selectShooter(T_far, [beachhead, column], true, new Set()),
    { shooter: "tank_column", weapon: "slamraam" });
  // Without the link the column can't see T_far and beachhead can't reach it -> no shooter (self-protect).
  assert.equal(selectShooter(T_far, [beachhead, column], false, new Set()), null);
});

test("DOD-8: shoot-and-shout — an engaged track is stood down", () => {
  const engaged = new Set<string>(["T_mid"]);
  assert.equal(selectShooter(T_mid, [beachhead, column], true, engaged), null);
});

test("non-hostile tracks are never engaged", () => {
  const friendly: Track = { id: "F1", pos: { x: 100, z: 0 }, faction: "friendly", threat: "NONE" };
  assert.equal(selectShooter(friendly, [beachhead, column], true, new Set()), null);
});

test("DOD-9/14: RF Zapper needs a human; Autonomous mode blocks it", () => {
  const pick = selectShooter(T_close, [beachhead, column], true, new Set());
  assert.deepEqual(pick, { shooter: "beachhead", weapon: "rf_zapper" });
  const auto = resolveEngagement(T_close, pick, "autonomous");
  assert.equal(auto.approved, false);
  assert.ok(auto.blockedReason && auto.requiresHuman);
  // Manual: requires a human, pauses on the gate (not auto-approved, not blocked).
  const man = resolveEngagement(T_close, pick, "manual");
  assert.equal(man.requiresHuman, true);
  assert.equal(man.approved, false);
  assert.equal(man.blockedReason, undefined);
});

test("DOD-9: missiles may clear on machine command in Autonomous", () => {
  const pick = selectShooter(T_mid, [beachhead, column], true, new Set()); // SLAMRAAM
  const auto = resolveEngagement(T_mid, pick, "autonomous");
  assert.equal(auto.requiresHuman, false);
  assert.equal(auto.approved, true);
});

test("DOD-10: operator modes change who must approve", () => {
  assert.equal(hasHumanSeat("manual"), true);
  assert.equal(hasHumanSeat("combined"), true);
  assert.equal(hasHumanSeat("autonomous"), false);
});

test("DOD-12: comms — persistent always up, intermittent ~70%", () => {
  for (let i = 0; i < 50; i++) assert.equal(commsAvailable("persistent", i), true);
  let up = 0; const N = 2000;
  for (let i = 0; i < N; i++) if (commsAvailable("intermittent", i)) up++;
  const frac = up / N;
  assert.ok(frac > 0.6 && frac < 0.8, `intermittent availability ${frac}`);
});

test("DOD-9/10/14: approvalGate — missiles auto/gate per mode; RF needs a human", () => {
  const missile = selectShooter(T_mid, [beachhead, column], true, new Set()); // SLAMRAAM (no human)
  const rf = selectShooter(T_close, [beachhead, column], true, new Set());    // RF Zapper (needs human)
  // Missile: Autonomous fires with no human; Combined needs 1; Manual needs 2 — the approver changes.
  assert.deepEqual(approvalGate(resolveEngagement(T_mid, missile, "autonomous"), "autonomous"),
    { trackId: "T_mid", needed: 0, autoFire: true, blocked: false });
  assert.equal(approvalGate(resolveEngagement(T_mid, missile, "combined"), "combined").needed, 1);
  assert.equal(approvalGate(resolveEngagement(T_mid, missile, "manual"), "manual").needed, 2);
  // RF Zapper: blocked in Autonomous (no human seat); gates on 1 human in Combined, 2 in Manual.
  assert.deepEqual(approvalGate(resolveEngagement(T_close, rf, "autonomous"), "autonomous"),
    { trackId: "T_close", needed: 0, autoFire: false, blocked: true });
  assert.equal(approvalGate(resolveEngagement(T_close, rf, "combined"), "combined").needed, 1);
  const man = approvalGate(resolveEngagement(T_close, rf, "manual"), "manual");
  assert.equal(man.needed, 2);
  assert.equal(man.autoFire, false);
  // No eligible shooter → nothing to gate (and nothing auto-fires).
  const none = approvalGate(resolveEngagement(T_far, null, "manual"), "manual");
  assert.deepEqual(none, { trackId: "T_far", needed: 0, autoFire: false, blocked: false });
});

test("DOD-12: commsHealth — LIVE up, DELAYED on a brief drop, FAILED past threshold", () => {
  assert.deepEqual(commsHealth(true, 10, 7), { linkNow: true, staleSec: 0, handoff: "LIVE" });
  const delayed = commsHealth(false, 9, 7, 4);  // 2s stale < 4s threshold
  assert.equal(delayed.handoff, "DELAYED");
  assert.equal(delayed.staleSec, 2);
  assert.equal(commsHealth(false, 12, 7, 4).handoff, "FAILED"); // 5s stale ≥ 4s → self-protect
});

test("link establishes only within range and when comms is available", () => {
  assert.equal(linkUp(beachhead, column, 1000, true), true);   // 800m apart, in range
  assert.equal(linkUp(beachhead, column, 500, true), false);   // out of link range
  assert.equal(linkUp(beachhead, column, 1000, false), false); // comms down this tick
});
