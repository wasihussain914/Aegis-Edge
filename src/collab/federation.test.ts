import { test } from "node:test";
import assert from "node:assert/strict";
import { toC2Event, fromC2Tasking } from "./federation.js";
import type { Track, EngagementDecision } from "../coop/types.js";
import type { EngagementTasking } from "./contract.js";

const hostile: Track = { id: "HOSTILE-2", pos: { x: 240, z: 140 }, faction: "hostile", threat: "HIGH" };
const friendly: Track = { id: "FRIEND-1", pos: { x: 120, z: -260 }, faction: "friendly", threat: "NONE" };
const defeatDec: EngagementDecision = {
  trackId: "HOSTILE-2", shooter: "beachhead", weapon: "rf_zapper", requiresHuman: true, approved: false,
  rationale: "Marine Beachhead engages HOSTILE-2 with the RF Drone Zapper — cheapest in-range by ROE.",
};

test("toC2Event: a hostile becomes a high-severity AIR threat with a defeat recommendation", () => {
  const e = toC2Event(hostile, defeatDec, 42);
  assert.equal(e.schema, "jadc2-threat.v1");
  assert.equal(e.domain, "air");
  assert.equal(e.source, "aegis-edge");
  assert.equal(e.classification, "HOSTILE");
  assert.equal(e.severity, 90);                 // HIGH → 90 on the shared 0..100 axis
  assert.equal(e.recommendedAction, "RECOMMEND_DEFEAT");
  assert.equal(e.requiresHuman, true);          // never a silent kill across the seam
  assert.match(e.rationale, /cheapest in-range/);
});

test("toC2Event: a friendly is HOLD_FRIENDLY, minimal severity — never engaged cross-domain", () => {
  const e = toC2Event(friendly,
    { trackId: "FRIEND-1", shooter: null, weapon: null, requiresHuman: false, approved: false, rationale: "friendly IFF" }, 42);
  assert.equal(e.recommendedAction, "HOLD_FRIENDLY");
  assert.ok(e.severity <= 5);
});

test("fromC2Tasking: an upstream ENGAGE without the two-person rule is REJECTED", () => {
  const t: EngagementTasking = { schema: "jadc2-tasking.v1", trackId: "HOSTILE-2", action: "ENGAGE",
    authorizedBy: "convoy-OIC", twoPerson: false, priority: 1, ts: 50 };
  const o = fromC2Tasking(t, true);
  assert.equal(o.engage, false);
  assert.equal(o.requiresLocalApproval, true);
});

test("fromC2Tasking: a two-person ENGAGE still re-gates locally when a human seat exists (defence in depth)", () => {
  const t: EngagementTasking = { schema: "jadc2-tasking.v1", trackId: "HOSTILE-2", action: "ENGAGE",
    authorizedBy: "convoy-OIC", twoPerson: true, priority: 1, ts: 50 };
  const manned = fromC2Tasking(t, true);
  assert.equal(manned.engage, false);
  assert.equal(manned.requiresLocalApproval, true);
  // only in a pre-authorized unmanned envelope does the C2-authorized tasking auto-execute
  const envelope = fromC2Tasking(t, false);
  assert.equal(envelope.engage, true);
});

test("fromC2Tasking: HOLD / MONITOR taskings never engage", () => {
  for (const action of ["HOLD", "MONITOR"] as const) {
    const o = fromC2Tasking({ schema: "jadc2-tasking.v1", trackId: "X", action, authorizedBy: "c2", twoPerson: true, priority: 3, ts: 9 }, false);
    assert.equal(o.engage, false);
  }
});
