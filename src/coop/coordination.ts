/**
 * Deterministic cooperative-engagement core. Pure functions, no I/O, no LLM.
 * Decides: who sees what, what fuses over the link, who shoots with which weapon (ROE),
 * shoot-and-shout stand-down, and whether the operator-mode approval gate can clear.
 */
import {
  type Unit, type Track, type WeaponType, type UnitId, type OperatorMode, type CommsCase,
  type EngagementDecision, WEAPON_COST, WEAPON_REQUIRES_HUMAN, MODE_SEATS,
} from "./types.js";

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

/** A unit "sees" a track when it is within that unit's radar OR EO/IR range. */
export function unitSees(unit: Unit, track: Track): boolean {
  const d = dist(unit.pos, track.pos);
  return d <= unit.radarRangeM || d <= unit.eoirRangeM;
}

/** Link-16 is up when the two units are within link range AND comms is available this tick. */
export function linkUp(a: Unit, b: Unit, linkRangeM: number, commsAvailable: boolean): boolean {
  return commsAvailable && dist(a.pos, b.pos) <= linkRangeM;
}

/**
 * The air picture a given unit holds. Without the link: only what it sees itself. With the link
 * up: the union of both units' tracks (shared situational awareness).
 */
export function airPicture(self: Unit, other: Unit, all: Track[], link: boolean): Track[] {
  const seen = all.filter((t) => unitSees(self, t));
  if (!link) return seen;
  const union = new Map<string, Track>();
  for (const t of all) if (unitSees(self, t) || unitSees(other, t)) union.set(t.id, t);
  return [...union.values()];
}

/** Comms availability for this tick. Case 1 = always up; Case 2 = ~70% (seeded, deterministic). */
export function commsAvailable(c: CommsCase, tick: number, availability = 0.7): boolean {
  if (c === "persistent") return true;
  // Deterministic pseudo-random in [0,1) from the tick (mulberry-ish), thresholded.
  let s = (tick * 2654435761) >>> 0;
  s ^= s >>> 15; s = Math.imul(s, 2246822519); s ^= s >>> 13;
  return ((s >>> 0) / 4294967296) < availability;
}

/** Cheapest in-range weapon a unit has against a track (or null). */
function bestWeapon(unit: Unit, track: Track): WeaponType | null {
  const d = dist(unit.pos, track.pos);
  const inRange = unit.weapons.filter((w) => d <= w.rangeM).map((w) => w.type);
  if (inRange.length === 0) return null;
  return inRange.sort((a, b) => WEAPON_COST[a] - WEAPON_COST[b])[0];
}

/**
 * Negotiate who shoots a hostile track. Across both units, pick the cheapest available, in-range
 * weapon (ROE); tie-break by the closer unit (better position). `engaged` are tracks already
 * fired on (shoot-and-shout) — excluded so no one double-engages. The link must be up for a unit
 * to shoot a track it can't see itself (cooperative engagement); without the link it self-protects.
 */
export function selectShooter(
  track: Track, units: [Unit, Unit], link: boolean, engaged: Set<string>,
): { shooter: UnitId; weapon: WeaponType } | null {
  if (track.faction !== "hostile") return null;
  if (engaged.has(track.id)) return null;
  const candidates: { unit: Unit; weapon: WeaponType; cost: number; d: number }[] = [];
  for (const u of units) {
    const canAct = unitSees(u, track) || link; // cooperative engagement only with the link up
    if (!canAct) continue;
    const w = bestWeapon(u, track);
    if (!w) continue;
    candidates.push({ unit: u, weapon: w, cost: WEAPON_COST[w], d: dist(u.pos, track.pos) });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.cost - b.cost) || (a.d - b.d) || a.unit.id.localeCompare(b.unit.id));
  return { shooter: candidates[0].unit.id, weapon: candidates[0].weapon };
}

/** Does the approval set include a human in this mode? (RF Zapper needs one.) */
export function hasHumanSeat(mode: OperatorMode): boolean {
  return MODE_SEATS[mode].includes("human");
}

/** Resolve the engagement gate for a chosen shooter/weapon under an operator mode. */
export function resolveEngagement(
  track: Track,
  pick: { shooter: UnitId; weapon: WeaponType } | null,
  mode: OperatorMode,
): EngagementDecision {
  if (!pick) {
    return { trackId: track.id, shooter: null, weapon: null, requiresHuman: false, approved: false,
      rationale: `No eligible shooter for ${track.id}: no unit holds an in-range weapon (or link down).` };
  }
  const requiresHuman = WEAPON_REQUIRES_HUMAN[pick.weapon];
  const human = hasHumanSeat(mode);
  // RF Zapper cannot clear without a human seat (Autonomous). Missiles clear in any mode.
  if (requiresHuman && !human) {
    return {
      trackId: track.id, shooter: pick.shooter, weapon: pick.weapon, requiresHuman: true, approved: false,
      blockedReason: "RF Zapper requires a human; Autonomous mode has no human seat",
      rationale: `${labelUnit(pick.shooter)} would use the RF Zapper (cheapest) on ${track.id}, but it needs a human approver and this mode has none — hold or escalate weapon.`,
    };
  }
  // Whether it auto-approves or pauses on a human gate is the UI's job; the core marks intent.
  const approved = !requiresHuman && mode === "autonomous"; // 2 AI may clear missiles autonomously
  return {
    trackId: track.id, shooter: pick.shooter, weapon: pick.weapon, requiresHuman, approved,
    rationale: `${labelUnit(pick.shooter)} engages ${track.id} with the ${labelWeapon(pick.weapon)} — cheapest in-range effector by ROE.${requiresHuman ? " Requires human approval." : ""}`,
  };
}

export function labelUnit(id: UnitId): string {
  return id === "beachhead" ? "Marine Beachhead" : "Army Tank Column";
}
export function labelWeapon(w: WeaponType): string {
  return w === "rf_zapper" ? "RF Drone Zapper" : w === "slamraam" ? "SLAMRAAM" : "SHORAD";
}
