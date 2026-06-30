import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MARINE_BEACHHEAD, ARMY_TANK_COLUMN, LINK_RANGE_M, columnPositionAt, tankColumnAt,
} from "./coopScenario.js";

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
