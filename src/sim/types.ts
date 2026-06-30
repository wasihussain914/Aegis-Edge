// ---------------------------------------------------------------------------
// C-UAS domain model. Reuses the cuas-events v0.1 vocabulary and the NED frame
// from wolfberg-platform/solutions/cuas (kinematic + cooperative-ID fusion).
//
// Coordinate frames:
//  - Sim/sensor frame: NED metres, FOB at origin. north (n), east (e), alt up.
//  - Render frame (three.js): X = east, Y = altitude, Z = -north. See worldFromNed().
// ---------------------------------------------------------------------------

export type Wcs = "HOLD" | "TIGHT" | "FREE" | "AUTO";
export const WCS_LEVELS: readonly Wcs[] = ["HOLD", "TIGHT", "FREE", "AUTO"] as const;

export type Affiliation = "noncoop" | "coop";

export type Classification = "CLEAR" | "WARNING" | "CRITICAL" | "COOPERATIVE";

export type RecommendedAction =
  | "MONITOR"
  | "TRACK"
  | "RECOMMEND_DEFEAT"
  | "AUTO_DEFEAT"
  | "HOLD_FRIENDLY";

export type PositiveId = "hostile" | "friendly" | "unknown";

export type TrackKind = "small-uas" | "fixed-wing" | "rotary" | "friendly-uas";

export interface Ned {
  n: number; // north, metres
  e: number; // east, metres
  alt: number; // altitude, metres AGL
}

export interface GateDecision {
  classification: Classification;
  recommendedAction: RecommendedAction;
  effectAuthorized: boolean;
  recommendOnly: boolean;
  requiresTwoPerson: boolean;
  fratricideBlock: boolean;
}

export interface Track {
  id: string;
  kind: TrackKind;
  role: string;
  affiliation: Affiliation;
  positiveId: PositiveId;

  pos: Ned;
  vel: Ned; // m/s in NED
  speed: number; // m/s ground+vertical magnitude

  rangeM: number; // slant range to FOB
  cpaM: number; // predicted closest point of approach
  timeToCpaS: number;
  closing: boolean;
  pManeuver: number; // IMM maneuver-model weight, 0..1

  gate: GateDecision;

  // lifecycle / engagement
  spawnT: number;
  alive: boolean;
  engaged: boolean; // a defeat effect has been committed
  defeated: boolean; // effect resolved (track removed)
  defeatT?: number;

  // visualization
  trail: Ned[];
  predicted: Ned[];
}

export interface LedgerEntry {
  seq: number;
  t: number; // sim time
  outcome: "POSTURE" | "ALLOWED" | "EXECUTED" | "DENIED" | "ABORT" | "HOLD";
  action: string;
  trackId?: string;
  who: string;
  prevHash: string;
  hash: string;
}

export interface Metrics {
  threatTracksSeen: number;
  threatTracksDetected: number;
  coopDecisions: number;
  falseEngagements: number;
}
