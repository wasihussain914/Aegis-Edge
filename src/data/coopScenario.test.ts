import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MARINE_BEACHHEAD, ARMY_TANK_COLUMN, LINK_RANGE_M, columnPositionAt, tankColumnAt,
  COOP_TRACKS, coopLinkUpAt,
} from "./coopScenario.js";
import { airPicture } from "../coop/coordination.js";

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

test("DOD-1: both units defined; Column starts out of link range and closes on the Beachhead", () => {
  assert.equal(MARINE_BEACHHEAD.mobile, false);
  assert.equal(ARMY_TANK_COLUMN.mobile, true);
  // Starts out of link range, ends well inside it (so Link-16 can establish as it closes).
  const start = columnPositionAt(0);
  assert.ok(dist(start, MARINE_BEACHHEAD.pos) > LINK_RANGE_M, "Column should start beyond link range");
  const late = columnPositionAt(1000);
  assert.ok(dist(late, MARINE_BEACHHEAD.pos) < LINK_RANGE_M, "Column should close inside link range");
});

test("DOD-1: Column position moves monotonically toward the Beachhead, then halts at standoff", () => {
  let prev = columnPositionAt(0).x;
  for (let t = 1; t <= 200; t++) {
    const x = columnPositionAt(t).x;
    assert.ok(x <= prev, `non-increasing x at tick ${t}`);
    prev = x;
  }
  // Clamped: never overruns the Beachhead, identical once standoff is reached.
  assert.equal(columnPositionAt(100000).x, columnPositionAt(99999).x);
  assert.ok(columnPositionAt(100000).x >= 0);
});

test("DOD-2: the Tank Column's radar is visibly more limited than the Beachhead's", () => {
  assert.ok(ARMY_TANK_COLUMN.radarRangeM < MARINE_BEACHHEAD.radarRangeM);
});

test("tankColumnAt reflects the deterministic position for the tick", () => {
  assert.deepEqual(tankColumnAt(5).pos, columnPositionAt(5));
});

test("DOD-6: coop tracks carry blue/red/green factions with ≥1 red threat present", () => {
  const factions = new Set(COOP_TRACKS.map((t) => t.faction));
  assert.ok(factions.has("friendly"), "≥1 blue/friendly");
  assert.ok(factions.has("hostile"), "≥1 red/hostile");
  assert.ok(factions.has("neutral"), "≥1 green/neutral");
  assert.ok(COOP_TRACKS.filter((t) => t.faction === "hostile").length >= 1, "≥1 red threat");
});

test("DOD-4: Link-16 is down at the start and establishes as the Column closes", () => {
  assert.equal(coopLinkUpAt(0), false, "out of link range at t=0");
  // 900 -> 600m gap crossed at ~33s @ 9 m/s; comfortably linked by t=60.
  assert.equal(coopLinkUpAt(60), true, "linked once the Column has closed inside range");
});

test("DOD-3: before link-up the two units hold DIFFERENT air pictures", () => {
  const beach = MARINE_BEACHHEAD;
  const col = tankColumnAt(0);
  const bPic = airPicture(beach, col, COOP_TRACKS, false).map((t) => t.id).sort();
  const cPic = airPicture(col, beach, COOP_TRACKS, false).map((t) => t.id).sort();
  assert.notDeepEqual(bPic, cPic, "pictures must differ out of link range");
  // The Beachhead holds HOSTILE-1 (in its radar); the Column does not see it before link.
  assert.ok(bPic.includes("HOSTILE-1"));
  assert.ok(!cPic.includes("HOSTILE-1"));
  // The Column holds the far-east NEUTRAL-1 at t=0; the Beachhead cannot.
  assert.ok(cPic.includes("NEUTRAL-1"));
  assert.ok(!bPic.includes("NEUTRAL-1"));
});

test("DOD-5: on link-up a single-unit track becomes shared (HOSTILE-1 fuses to the Column)", () => {
  const beach = MARINE_BEACHHEAD;
  const col = tankColumnAt(60); // closed in, link up
  const before = airPicture(col, beach, COOP_TRACKS, false).map((t) => t.id);
  assert.ok(!before.includes("HOSTILE-1"), "Column blind to HOSTILE-1 without the link");
  const after = airPicture(col, beach, COOP_TRACKS, true).map((t) => t.id);
  assert.ok(after.includes("HOSTILE-1"), "Column gains HOSTILE-1 via Link-16 fusion");
});
