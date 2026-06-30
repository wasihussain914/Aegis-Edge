/**
 * Cooperative two-unit scenario data (DOD-1, DOD-2). Pure data + a deterministic motion
 * function — no three.js, no I/O. The 3D layer reads these; the coop core decides on them.
 *
 * Marine Beachhead: stationary, BROAD radar, SHORAD + RF Zapper.
 * Army Tank Column:  mobile, LIMITED radar, SLAMRAAM + RF Zapper — closes on the Beachhead so
 * the Link-16 fusion becomes worthwhile (its small radar is the whole reason to share tracks).
 *
 * Coordinates: site-local meters (x east, z north), same frame as scenario.ts.
 */
import type { Unit } from "../coop/types.js";

/** Link-16 establishes purely on range between the two units (no terrain LOS). */
export const LINK_RANGE_M = 600;

/** Stationary Marine Beachhead — broad radar, short-range effectors. */
export const MARINE_BEACHHEAD: Unit = {
  id: "beachhead",
  name: "Marine Beachhead",
  pos: { x: 0, z: 0 },
  mobile: false,
  radarRangeM: 500, // broad area radar
  eoirRangeM: 350,
  weapons: [
    { type: "shorad", rangeM: 400 },
    { type: "rf_zapper", rangeM: 250 },
  ],
};

// The Column starts well out of link range and drives toward the Beachhead, halting at standoff.
const COLUMN_START = { x: 900, z: 0 };
const COLUMN_STANDOFF_X = 200;
const COLUMN_SPEED_MPS = 9;

/**
 * Deterministic Column position at a given tick: it closes on the Beachhead at a fixed speed
 * and stops at standoff. Same input -> same output (testable, no randomness).
 */
export function columnPositionAt(tick: number, dtSec = 1): { x: number; z: number } {
  const traveled = Math.max(0, tick) * COLUMN_SPEED_MPS * dtSec;
  const x = Math.max(COLUMN_STANDOFF_X, COLUMN_START.x - traveled);
  return { x, z: 0 };
}

/** Mobile Army Tank Column at a given tick — LIMITED radar; longer-reach SLAMRAAM + RF. */
export function tankColumnAt(tick: number, dtSec = 1): Unit {
  return {
    id: "tank_column",
    name: "Army Tank Column",
    pos: columnPositionAt(tick, dtSec),
    mobile: true,
    radarRangeM: 200, // LIMITED — visibly smaller than the Beachhead's; drives the data-sharing
    eoirRangeM: 300,
    weapons: [
      { type: "slamraam", rangeM: 600 },
      { type: "rf_zapper", rangeM: 250 },
    ],
  };
}

/** The Column at t=0 (initial render). Use tankColumnAt(tick) to advance it. */
export const ARMY_TANK_COLUMN: Unit = tankColumnAt(0);
