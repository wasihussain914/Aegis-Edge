import { test } from "node:test";
import assert from "node:assert/strict";
import { unitCoverages } from "./coverage.js";
import { MARINE_BEACHHEAD, ARMY_TANK_COLUMN } from "../data/coopScenario.js";

test("DOD-2: Beachhead reads broad, Tank Column reads limited", () => {
  const cov = unitCoverages([MARINE_BEACHHEAD, ARMY_TANK_COLUMN]);
  const beach = cov.find((c) => c.unitId === "beachhead")!;
  const column = cov.find((c) => c.unitId === "tank_column")!;
  assert.equal(beach.radarClass, "broad");
  assert.equal(column.radarClass, "limited");
  assert.ok(column.radarRadiusM < beach.radarRadiusM, "Column dome must be visibly smaller");
});

test("coverage radii map straight from the unit's sensor ranges", () => {
  const [beach] = unitCoverages([MARINE_BEACHHEAD]);
  assert.equal(beach.radarRadiusM, MARINE_BEACHHEAD.radarRangeM);
  assert.equal(beach.eoirRadiusM, MARINE_BEACHHEAD.eoirRangeM);
});

test("radar class is relative: a lone unit is its own broad baseline", () => {
  // With only one unit in the set, it holds the minimum radar range -> classed limited.
  const [solo] = unitCoverages([ARMY_TANK_COLUMN]);
  assert.equal(solo.radarClass, "limited");
});
