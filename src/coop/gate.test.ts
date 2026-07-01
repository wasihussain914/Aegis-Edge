import { test } from "node:test";
import assert from "node:assert/strict";
import { approvalGate, commsHealth, selectShooter, hasHumanSeat } from "./coordination.js";
import { MARINE_BEACHHEAD, tankColumnAt, COOP_TRACKS } from "../data/coopScenario.js";
import type { EngagementDecision, Unit } from "./types.js";

const units: [Unit, Unit] = [MARINE_BEACHHEAD, tankColumnAt(80)]; // Column at standoff, in link range
const missile: EngagementDecision = { trackId: "H", shooter: "beachhead", weapon: "slamraam", requiresHuman: false, approved: false, rationale: "" };
const rf: EngagementDecision = { trackId: "H", shooter: "beachhead", weapon: "rf_zapper", requiresHuman: true, approved: false, rationale: "" };

test("approvalGate: a missile needs 0/1/2 approvers by mode; auto-fires only in autonomous (DOD-10/14)", () => {
  const a = approvalGate(missile, "autonomous");
  assert.equal(a.needed, 0); assert.equal(a.autoFire, true); assert.equal(a.blocked, false);
  assert.equal(approvalGate(missile, "combined").needed, 1);
  assert.equal(approvalGate(missile, "combined").autoFire, false);
  assert.equal(approvalGate(missile, "manual").needed, 2);
  assert.equal(approvalGate(missile, "manual").autoFire, false);
});

test("approvalGate: the RF Zapper is BLOCKED in autonomous (needs a human), gated in manual (DOD-9)", () => {
  const auto = approvalGate(rf, "autonomous");
  assert.equal(auto.blocked, true); assert.equal(auto.autoFire, false); assert.equal(auto.needed, 0);
  const man = approvalGate(rf, "manual");
  assert.equal(man.blocked, false); assert.equal(man.needed, 2);
});

test("approvalGate: no shooter/weapon → nothing to gate", () => {
  const none: EngagementDecision = { trackId: "H", shooter: null, weapon: null, requiresHuman: false, approved: false, rationale: "" };
  const g = approvalGate(none, "manual");
  assert.equal(g.needed, 0); assert.equal(g.autoFire, false); assert.equal(g.blocked, false);
});

test("commsHealth: LIVE up; DELAYED then FAILED as staleness crosses the threshold (DOD-12)", () => {
  assert.equal(commsHealth(true, 10, 10).handoff, "LIVE");
  assert.equal(commsHealth(false, 12, 10, 4).handoff, "DELAYED"); // 2s stale < 4s
  assert.equal(commsHealth(false, 15, 10, 4).handoff, "FAILED");  // 5s stale ≥ 4s
});

test("hasHumanSeat: manual & combined have a human seat; autonomous does not", () => {
  assert.equal(hasHumanSeat("manual"), true);
  assert.equal(hasHumanSeat("combined"), true);
  assert.equal(hasHumanSeat("autonomous"), false);
});

test("selectShooter: never targets a non-hostile or an already-engaged track; picks a shooter when link is up", () => {
  const friendly = COOP_TRACKS.find((t) => t.faction === "friendly")!;
  assert.equal(selectShooter(friendly, units, true, new Set()), null);
  const hostile = COOP_TRACKS.find((t) => t.faction === "hostile")!;
  assert.equal(selectShooter(hostile, units, true, new Set([hostile.id])), null);
  const pick = selectShooter(hostile, units, true, new Set());
  assert.ok(pick && pick.shooter && pick.weapon);
});
