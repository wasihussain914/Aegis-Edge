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
import type { Unit, Track } from "../coop/types.js";
import { linkUp, commsAvailable } from "../coop/coordination.js";
import type { CommsCase } from "../coop/types.js";

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

/**
 * Coop air picture — the drones the two units are cooperating over (DOD-6 factions; DOD-3/5 fusion).
 * Static positions, chosen against the unit sensor geometry so the picture is meaningful:
 *   - HOSTILE-1 sits in the Beachhead's radar but outside the Column's reach for the whole run, so
 *     it is a BEACHHEAD-ONLY track until the link comes up — the clean DOD-5 "single-unit → shared"
 *     demonstration once Link-16 establishes.
 *   - NEUTRAL-1 sits far east, only inside the Column's radar while it's still out at standoff start,
 *     so at t=0 the Column holds a track the Beachhead can't see → the two pictures DIFFER (DOD-3).
 *   - HOSTILE-2 closes-range hostile near the Column's standoff, in range of both once linked — the
 *     red threat that will drive the Phase-D engagement.
 *   - FRIEND-1 a blue friendly that must never be engaged.
 * ≥1 red (two), ≥1 blue, ≥1 green — satisfies the faction-coloring requirement.
 */
export const COOP_TRACKS: Track[] = [
  { id: "HOSTILE-1", pos: { x: -140, z: 300 }, faction: "hostile", threat: "HIGH" },
  { id: "HOSTILE-2", pos: { x: 820, z: 420 }, faction: "hostile", threat: "HIGH" }, // penetrator — starts FAR, flies in
  { id: "FRIEND-1", pos: { x: 120, z: -260 }, faction: "friendly", threat: "NONE" },
  { id: "NEUTRAL-1", pos: { x: 900, z: 120 }, faction: "neutral", threat: "NONE" },
];

/**
 * The demo penetrator (HOSTILE-2): starts far out and flies straight toward the protected asset,
 * halting at 25 m. Deterministic by tick. The 3D layer advances its track position with this each
 * frame, so the units DETECT it on approach (out-of-range → in-range), CLASSIFY it HOSTILE, and
 * DESTROY it once engaged — the full "detect → classify → defeat" arc.
 */
export const PENETRATOR_ID = "HOSTILE-2";
const PEN_START = { x: 820, z: 420 };
const PEN_SPEED_MPS = 24;
export function penetratorPositionAt(tick: number, dtSec = 1): { x: number; z: number } {
  const len = Math.hypot(PEN_START.x, PEN_START.z);
  const travel = Math.min(len - 25, Math.max(0, tick) * PEN_SPEED_MPS * dtSec);
  const f = len > 0 ? travel / len : 0;
  return { x: PEN_START.x * (1 - f), z: PEN_START.z * (1 - f) };
}

/**
 * Deterministic Link-16 state between the two units at a given tick. The Column closes on the
 * Beachhead (tested motion), so the link establishes purely on range; in Case 2 (intermittent)
 * comms also drops ~30% of ticks. Pure — the renderer and the tests share this one source of truth
 * so "link establishes as the Column closes" (DOD-4) is test-backed, not eyeballed.
 */
export function coopLinkUpAt(tick: number, comms: CommsCase = "persistent", dtSec = 1): boolean {
  const column = tankColumnAt(tick, dtSec);
  return linkUp(MARINE_BEACHHEAD, column, LINK_RANGE_M, commsAvailable(comms, tick));
}
