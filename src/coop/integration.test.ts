/**
 * F1 — coop integration smoke test. Walks the REAL scenario (the same data + deterministic core the
 * 3D scene drives each tick) end to end and asserts every one of the 14 DoD behaviors holistically,
 * where they COMPOSE across modules — not the per-unit logic the unit tests already cover. This is
 * the test-backed walk of the Definition of Done; the renderer only draws what these functions
 * decide, so green here means the demo's claims are true. Pure: same ticks → same outcomes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MARINE_BEACHHEAD, tankColumnAt, columnPositionAt, COOP_TRACKS, coopLinkUpAt, LINK_RANGE_M,
} from "../data/coopScenario.js";
import {
  unitSees, airPicture, selectShooter, resolveEngagement, approvalGate, commsHealth,
} from "./coordination.js";
import { planEngagements, engagementRationale } from "./engagement.js";
import { unitCoverages } from "./coverage.js";
import type { Unit, OperatorMode } from "./types.js";

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const T_STANDOFF = 80; // by t=80 the Column has closed to its standoff (x=200) and the link is in range

const beach = MARINE_BEACHHEAD;
const colStandoff = tankColumnAt(T_STANDOFF);
const H1 = COOP_TRACKS.find((t) => t.id === "HOSTILE-1")!;
const H2 = COOP_TRACKS.find((t) => t.id === "HOSTILE-2")!;

test("DOD-1: both units exist; the Column closes on the Beachhead then clamps at standoff", () => {
  assert.equal(beach.id, "beachhead");
  assert.equal(tankColumnAt(0).id, "tank_column");
  // monotonic close-in then halt (mobile column drives toward the stationary beachhead)
  assert.ok(columnPositionAt(0).x > columnPositionAt(40).x);
  assert.ok(columnPositionAt(40).x > columnPositionAt(60).x);
  assert.equal(columnPositionAt(T_STANDOFF).x, columnPositionAt(999).x); // clamped at standoff
});

test("DOD-2: distinct coverage — the Column's radar is LIMITED and its dome smaller", () => {
  const [bCov, cCov] = unitCoverages([beach, colStandoff]);
  assert.equal(bCov.radarClass, "broad");
  assert.equal(cCov.radarClass, "limited");
  assert.ok(cCov.radarRadiusM < bCov.radarRadiusM);
});

test("DOD-3: out of link range the two air pictures DIFFER", () => {
  const col0 = tankColumnAt(0);
  assert.equal(coopLinkUpAt(0), false); // link is down at t=0
  const bPic = new Set(airPicture(beach, col0, COOP_TRACKS, false).map((t) => t.id));
  const cPic = new Set(airPicture(col0, beach, COOP_TRACKS, false).map((t) => t.id));
  assert.notDeepEqual([...bPic].sort(), [...cPic].sort()); // not the same picture
  assert.ok(bPic.has("HOSTILE-1") && !cPic.has("HOSTILE-1")); // Beachhead-only track
  assert.ok(cPic.has("NEUTRAL-1") && !bPic.has("NEUTRAL-1")); // Column-only track
});

test("DOD-4: Link-16 establishes as the Column closes into range", () => {
  assert.equal(coopLinkUpAt(0), false);
  assert.ok(dist(beach.pos, tankColumnAt(0).pos) > LINK_RANGE_M);
  assert.equal(coopLinkUpAt(T_STANDOFF), true);
  assert.ok(dist(beach.pos, colStandoff.pos) <= LINK_RANGE_M);
});

test("DOD-5: a single-unit track becomes shared on link-up (fusion)", () => {
  // HOSTILE-1 is held by the Beachhead only — the Column never sees it organically all run.
  assert.ok(unitSees(beach, H1));
  assert.ok(!unitSees(colStandoff, H1));
  const colNoLink = new Set(airPicture(colStandoff, beach, COOP_TRACKS, false).map((t) => t.id));
  const colLinked = new Set(airPicture(colStandoff, beach, COOP_TRACKS, true).map((t) => t.id));
  assert.ok(!colNoLink.has("HOSTILE-1"));   // not in the Column's picture before the link
  assert.ok(colLinked.has("HOSTILE-1"));    // shared into it once Link-16 is up
});

test("DOD-6/7/8: a red hostile drives a cooperative engagement; shoot-and-shout stands the other unit down", () => {
  assert.ok(COOP_TRACKS.some((t) => t.faction === "hostile"));
  assert.ok(COOP_TRACKS.some((t) => t.faction === "friendly"));
  assert.ok(COOP_TRACKS.some((t) => t.faction === "neutral"));
  const units: [Unit, Unit] = [beach, colStandoff];
  const plan = planEngagements(COOP_TRACKS, units, true, "autonomous", new Set());
  const h1 = plan.outcomes.find((o) => o.track.id === "HOSTILE-1")!;
  // DOD-7: the engagement resolves with a who-shoots line; it's COOPERATIVE — the Column fires a
  // track it cannot see itself (only via the fused link), and that's the cheapest in-range effector.
  assert.equal(h1.status, "FIRE");
  assert.equal(h1.decision.shooter, "tank_column");
  assert.equal(h1.decision.weapon, "slamraam");
  assert.match(h1.logLine, /ENGAGES HOSTILE-1/);
  // DOD-8: the firing unit's partner stands down, and the track is now in `engaged`...
  assert.equal(h1.standDown, "beachhead");
  assert.ok(plan.engaged.has("HOSTILE-1"));
  // ...so a subsequent tick does NOT re-select it (no double-engage).
  const next = planEngagements(COOP_TRACKS, units, true, "autonomous", plan.engaged);
  assert.equal(next.outcomes.find((o) => o.track.id === "HOSTILE-1")!.status, "NONE");
});

test("DOD-9: RF Zapper requires a human; missiles go human-or-machine", () => {
  const units: [Unit, Unit] = [beach, colStandoff];
  // HOSTILE-2's cheapest in-range effector is the RF Zapper (Column, cost 0) — needs a human.
  const pick = selectShooter(H2, units, true, new Set());
  assert.equal(pick?.weapon, "rf_zapper");
  assert.equal(approvalGate(resolveEngagement(H2, pick, "autonomous"), "autonomous").blocked, true);
  // The SLAMRAAM engagement on HOSTILE-1 is machine-authorized in Autonomous (no human needed).
  const missile = selectShooter(H1, units, true, new Set());
  assert.equal(approvalGate(resolveEngagement(H1, missile, "autonomous"), "autonomous").autoFire, true);
});

test("DOD-10/14: the operator mode changes the approver live; nothing auto-fires past a human gate", () => {
  const units: [Unit, Unit] = [beach, colStandoff];
  const missile = selectShooter(H1, units, true, new Set());
  const need = (m: OperatorMode) => approvalGate(resolveEngagement(H1, missile, m), m);
  // DOD-10: same engagement, the approver count changes with the mode, live.
  assert.equal(need("autonomous").needed, 0);
  assert.equal(need("combined").needed, 1);
  assert.equal(need("manual").needed, 2);
  // DOD-14: any mode with a human seat PAUSES — needed>0 and autoFire false (nothing fires past it).
  for (const m of ["combined", "manual"] as OperatorMode[]) {
    assert.ok(need(m).needed > 0);
    assert.equal(need(m).autoFire, false);
  }
});

test("DOD-11: click rationale is plain English — who shoots + why for a hostile, hold fire for non-hostiles", () => {
  const units: [Unit, Unit] = [beach, colStandoff];
  const hostile = engagementRationale(H1, units, true, "autonomous", new Set());
  assert.match(hostile, /HOSTILE-1/);
  assert.match(hostile, /SLAMRAAM|cheapest|ROE/i); // names the weapon / why-this-weapon
  const friendly = engagementRationale(COOP_TRACKS.find((t) => t.faction === "friendly")!, units, true, "autonomous", new Set());
  assert.match(friendly, /hold fire/i);
});

test("DOD-12: Case 2 drops the link; handoff ages LIVE → DELAYED → FAILED (fallback to self-protect)", () => {
  // In range at standoff: Case 1 (persistent) never drops; Case 2 (intermittent) drops on some ticks.
  let anyDrop = false;
  for (let t = T_STANDOFF; t < T_STANDOFF + 30; t++) {
    assert.equal(coopLinkUpAt(t, "persistent"), true);      // Case 1 steady
    if (!coopLinkUpAt(t, "intermittent")) anyDrop = true;   // Case 2 intermittent
  }
  assert.ok(anyDrop, "Case 2 must drop the link on at least one in-range tick");
  // The handoff health ages across a drop: LIVE up, DELAYED a brief drop, FAILED past the threshold.
  assert.equal(commsHealth(true, 10, 10).handoff, "LIVE");
  assert.equal(commsHealth(false, 12, 10, 4).handoff, "DELAYED"); // 2s stale < 4s
  assert.equal(commsHealth(false, 15, 10, 4).handoff, "FAILED");  // 5s stale ≥ 4s → self-protect
});

test("DOD-13: perspective — each unit holds its own air picture, and they differ", () => {
  const link = coopLinkUpAt(T_STANDOFF);
  const beachView = airPicture(beach, colStandoff, COOP_TRACKS, link);
  const colView = airPicture(colStandoff, beach, COOP_TRACKS, link);
  // Even linked, the per-unit ORGANIC split differs: HOSTILE-1 is organic to the Beachhead, via-link
  // to the Column — so "view as Beachhead" vs "view as Column" is a real, different vantage.
  const beachOrganic = beachView.filter((t) => unitSees(beach, t)).map((t) => t.id);
  const colOrganic = colView.filter((t) => unitSees(colStandoff, t)).map((t) => t.id);
  assert.ok(beachOrganic.includes("HOSTILE-1"));
  assert.ok(!colOrganic.includes("HOSTILE-1"));
  assert.notDeepEqual(beachOrganic.sort(), colOrganic.sort());
});
