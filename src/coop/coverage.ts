/**
 * Coverage volumes for the cooperating units — DETERMINISTIC, no three.js. The 3D layer renders
 * these verbatim: the core decides how big each unit's sensor dome is and which radar counts as
 * "limited" (DOD-2). Keeping this here (not in main.ts) means the "Column radar visibly limited"
 * claim is test-covered, not asserted by eyeballing the scene.
 */
import type { Unit, UnitId } from "./types.js";

export type RadarClass = "broad" | "limited";

export interface UnitCoverage {
  unitId: UnitId;
  radarRadiusM: number; // radar dome radius the renderer draws
  eoirRadiusM: number;  // narrower EO/IR ring inside the dome
  radarClass: RadarClass; // RELATIVE: smallest-radar unit(s) are "limited", the rest "broad"
}

/**
 * Coverage volumes for a set of cooperating units. Radar class is relative across the set: the
 * unit(s) holding the minimum radar range are "limited"; everything with more reach is "broad".
 * Same input -> same output (pure), so a test can assert the Column reads as limited vs the
 * Beachhead's broad coverage without rendering anything.
 */
export function unitCoverages(units: Unit[]): UnitCoverage[] {
  const minRadar = Math.min(...units.map((u) => u.radarRangeM));
  return units.map((u) => ({
    unitId: u.id,
    radarRadiusM: u.radarRangeM,
    eoirRadiusM: u.eoirRangeM,
    radarClass: u.radarRangeM <= minRadar ? "limited" : "broad",
  }));
}
