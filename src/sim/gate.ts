// ---------------------------------------------------------------------------
// The C-UAS governance gate — ROE / Weapons Control Status enforced in code.
// Faithful TypeScript port of wolfberg-platform/solutions/cuas/pipeline/gate.py.
//
// Pure, deterministic, auditable. No model in this path. This is the spine that
// makes the <0.1% false-positive guarantee structural, not procedural:
//   - A cooperative (ADS-B / Remote ID) contact is positively friendly and maps
//     deterministically to HOLD_FRIENDLY — never engageable, whatever its kinematics.
//   - Defeat is RECOMMEND-ONLY unless AUTO is armed (a two-person act).
//   - HOLD is default: self-defense effects only.
// ---------------------------------------------------------------------------

import type {
  Classification,
  GateDecision,
  PositiveId,
  RecommendedAction,
  Wcs,
} from "./types";

// CPA thresholds (metres) against the protected FOB.
export const CPA_CRITICAL = 50.0;
export const CPA_WARNING = 150.0;

export interface Prediction {
  cpa: number;
  timeToCpa: number;
  rangeNow: number;
  speed: number;
  closing: boolean;
  pManeuver: number;
}

export interface GateContext {
  wcs: Wcs;
  autoArmed: boolean;
  positiveId: PositiveId;
  selfDefense: boolean;
  cooperative: boolean;
}

export function classify(p: Prediction): Classification {
  if (p.closing && p.cpa <= CPA_CRITICAL) return "CRITICAL";
  if (p.closing && p.cpa <= CPA_WARNING) return "WARNING";
  return "CLEAR";
}

function decision(
  classification: Classification,
  recommendedAction: RecommendedAction,
  effectAuthorized: boolean,
  recommendOnly: boolean,
  requiresTwoPerson: boolean,
  fratricideBlock: boolean,
): GateDecision {
  return {
    classification,
    recommendedAction,
    effectAuthorized,
    recommendOnly,
    requiresTwoPerson,
    fratricideBlock,
  };
}

/** Apply ROE / WCS to one trajectory prediction. */
export function evaluate(p: Prediction, ctx: GateContext): GateDecision {
  // Cooperative contacts surface as COOPERATIVE and are deconflicted up front.
  if (ctx.cooperative || ctx.positiveId === "friendly") {
    // 1. Friendly-force deconfliction (fratricide check) — hard block on any defeat.
    return decision("COOPERATIVE", "HOLD_FRIENDLY", false, true, false, true);
  }

  const cls = classify(p);

  // 2. Below threat threshold => track/monitor only, no effect.
  if (cls === "CLEAR") {
    return decision(cls, p.closing ? "TRACK" : "MONITOR", false, true, false, false);
  }

  // 3. Self-defense is always available, even at HOLD.
  if (ctx.selfDefense) {
    return decision(cls, "RECOMMEND_DEFEAT", true, true, false, false);
  }

  // 4. WCS governs whether a defeat is even on the table.
  if (ctx.wcs === "HOLD") {
    return decision(cls, "TRACK", false, true, false, false);
  }

  if (ctx.wcs === "AUTO" && ctx.autoArmed && cls === "CRITICAL") {
    // Armed auto-defense inside the bounded envelope; two-person to have armed.
    return decision(cls, "AUTO_DEFEAT", true, false, true, false);
  }

  // 5. TIGHT is STRICT positive-ID: only a positively-identified hostile may be
  //    recommended for defeat. A merely-unknown track at TIGHT is tracked.
  if (ctx.wcs === "TIGHT" && ctx.positiveId !== "hostile") {
    return decision(cls, "TRACK", false, true, false, false);
  }

  // FREE, TIGHT-with-hostile-PID, or AUTO-not-armed: defeat may be RECOMMENDED,
  // never auto-executed. The human gate (and for AUTO a second authorizer) remain.
  const requiresTwo = ctx.wcs === "AUTO";
  return decision(cls, "RECOMMEND_DEFEAT", true, true, requiresTwo, false);
}

export function wcsNote(wcs: Wcs): string {
  switch (wcs) {
    case "HOLD":
      return "HOLD — self-defense only. The gate authorizes no offensive engagement.";
    case "TIGHT":
      return "TIGHT — engage only a positively-identified hostile meeting ROE.";
    case "FREE":
      return "FREE — engage targets not positively identified as friendly.";
    case "AUTO":
      return "AUTO — armed auto-defense in a bounded envelope. Two-person to arm.";
  }
}
