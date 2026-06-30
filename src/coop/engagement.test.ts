import { test } from "node:test";
import assert from "node:assert/strict";
import { planEngagements, engagementRationale, statusOf } from "./engagement.js";
import { MARINE_BEACHHEAD, tankColumnAt, COOP_TRACKS, coopLinkUpAt } from "../data/coopScenario.js";
import type { Unit } from "./types.js";

// At a late tick the Column has closed to standoff (x=200) and Link-16 is up (gap 200 ≤ 600m).
// COOP_TRACKS positions are the hostiles' ARRIVAL positions (the 3D layer flies them in to these).
const TICK = 100;
const beach = MARINE_BEACHHEAD;
const column = tankColumnAt(TICK);
const units: [Unit, Unit] = [beach, column];
const link = coopLinkUpAt(TICK, "persistent");
const hostiles = COOP_TRACKS.filter((t) => t.faction === "hostile");

test("setup: link is up at standoff and there are exactly two red hostiles", () => {
  assert.equal(link, true);
  assert.equal(hostiles.length, 2);
});

test("DOD-6/DOD-7: a red hostile drives a cooperative engagement (link up, autonomous)", () => {
  const { outcomes } = planEngagements(COOP_TRACKS, units, link, "autonomous", new Set());
  // only hostiles produce outcomes — friendly/neutral are never engaged
  assert.equal(outcomes.length, 2);
  const h1 = outcomes.find((o) => o.track.id === "HOSTILE-1")!;
  // Column fires SLAMRAAM on a track it can't even see itself — pure cooperative engagement over the link.
  assert.equal(h1.fired, true);
  assert.equal(h1.status, "FIRE");
  assert.equal(h1.decision.shooter, "tank_column");
  assert.equal(h1.decision.weapon, "slamraam");
  assert.equal(h1.standDown, "beachhead");      // shoot-and-shout: the Beachhead stands down
  assert.match(h1.logLine, /ENGAGES HOSTILE-1/);
  assert.match(h1.logLine, /stands down/);
});

test("DOD-8: shoot-and-shout persists — an engaged track is not re-selected next tick", () => {
  const first = planEngagements(COOP_TRACKS, units, link, "autonomous", new Set());
  // carry the engaged set into the next tick
  const second = planEngagements(COOP_TRACKS, units, link, "autonomous", first.engaged);
  const h1 = second.outcomes.find((o) => o.track.id === "HOSTILE-1")!;
  assert.equal(h1.fired, false);
  assert.equal(h1.status, "NONE");              // selectShooter excludes the already-engaged track
  assert.equal(h1.decision.shooter, null);
});

test("DOD-9: the cheapest weapon on a closer hostile is the RF Zapper — holds for a human in autonomous, gates in manual", () => {
  const auto = planEngagements(COOP_TRACKS, units, link, "autonomous", new Set());
  const h2a = auto.outcomes.find((o) => o.track.id === "HOSTILE-2")!;
  assert.equal(h2a.decision.weapon, "rf_zapper"); // cheapest in-range across both units
  assert.equal(h2a.fired, false);
  assert.equal(h2a.status, "HOLD");               // RF needs a human; autonomous has none
  assert.ok(h2a.decision.blockedReason);

  const man = planEngagements(COOP_TRACKS, units, link, "manual", new Set());
  const h2m = man.outcomes.find((o) => o.track.id === "HOSTILE-2")!;
  assert.equal(h2m.status, "GATE");               // manual HAS a human → pauses on the gate, doesn't fire
  assert.equal(h2m.fired, false);
});

test("statusOf maps the core decision to a coarse status", () => {
  assert.equal(statusOf({ trackId: "x", shooter: null, weapon: null, requiresHuman: false, approved: false, rationale: "" }), "NONE");
  assert.equal(statusOf({ trackId: "x", shooter: "beachhead", weapon: "slamraam", requiresHuman: false, approved: true, rationale: "" }), "FIRE");
  assert.equal(statusOf({ trackId: "x", shooter: "beachhead", weapon: "rf_zapper", requiresHuman: true, approved: false, blockedReason: "no human", rationale: "" }), "HOLD");
  assert.equal(statusOf({ trackId: "x", shooter: "beachhead", weapon: "rf_zapper", requiresHuman: true, approved: false, rationale: "" }), "GATE");
  assert.equal(statusOf({ trackId: "x", shooter: "beachhead", weapon: "slamraam", requiresHuman: false, approved: false, rationale: "" }), "READY");
});

test("DOD-11: engagementRationale — non-hostile holds fire; hostile names who-shoots + why", () => {
  const friend = COOP_TRACKS.find((t) => t.id === "FRIEND-1")!;
  const fr = engagementRationale(friend, units, link, "autonomous", new Set());
  assert.match(fr, /FRIENDLY/);
  assert.match(fr, /hold fire/);
  const h2 = COOP_TRACKS.find((t) => t.id === "HOSTILE-2")!;
  const hr = engagementRationale(h2, units, link, "manual", new Set());
  assert.match(hr, /RF Drone Zapper|human/);
});
