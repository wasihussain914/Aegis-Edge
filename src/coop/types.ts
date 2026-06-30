/**
 * Cooperative two-unit drone defense — shared types for the DETERMINISTIC core.
 * No three.js, no I/O. The engine in coordination.ts decides; the LLM only explains.
 */

export type UnitId = "beachhead" | "tank_column";
export type Faction = "friendly" | "hostile" | "neutral"; // blue / red / green

/** Weapons, cheapest engagement cost first (ROE order): RF Zapper -> SLAMRAAM -> SHORAD. */
export type WeaponType = "rf_zapper" | "slamraam" | "shorad";
export const WEAPON_COST: Record<WeaponType, number> = { rf_zapper: 0, slamraam: 1, shorad: 2 };
/** RF Zapper requires a human in the approval set; the missiles may go human-OR-machine. */
export const WEAPON_REQUIRES_HUMAN: Record<WeaponType, boolean> = {
  rf_zapper: true,
  slamraam: false,
  shorad: false,
};

export interface Weapon {
  type: WeaponType;
  rangeM: number;
}

export interface Unit {
  id: UnitId;
  name: string;
  pos: { x: number; z: number };
  mobile: boolean;
  radarRangeM: number; // Beachhead broad, Tank Column limited
  eoirRangeM: number;
  weapons: Weapon[];
}

/** A tactical track as known to the picture (position + the classification faction/threat). */
export interface Track {
  id: string;
  pos: { x: number; z: number };
  faction: Faction;
  threat: "NONE" | "LOW" | "MED" | "HIGH";
}

export type OperatorMode = "manual" | "combined" | "autonomous";
/** Who fills the two confirmation seats in each mode. */
export const MODE_SEATS: Record<OperatorMode, ["human" | "ai", "human" | "ai"]> = {
  manual: ["human", "human"],
  combined: ["human", "ai"],
  autonomous: ["ai", "ai"],
};

export type CommsCase = "persistent" | "intermittent"; // Case 1 / Case 2 (~70%)

export interface EngagementDecision {
  trackId: string;
  shooter: UnitId | null;     // null = no eligible shooter
  weapon: WeaponType | null;
  requiresHuman: boolean;     // does the approval set need a human?
  approved: boolean;          // cleared the gate?
  blockedReason?: string;     // e.g. "RF Zapper needs a human; Autonomous mode has none"
  rationale: string;          // plain-English-able summary (template; LLM may rewrite)
}
