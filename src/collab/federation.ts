/**
 * Federation adapter — the two functions that make the collaboration real:
 *   toC2Event   : Aegis-Edge air track + gate decision  → partner C2 cross-domain threat
 *   fromC2Tasking: partner C2 approved tasking           → a local order our human gate re-checks
 * Pure + deterministic → unit-tested. This is the single seam between the two projects.
 */
import type { Track, EngagementDecision } from "../coop/types.js";
import type { CrossDomainThreat, EngagementTasking, RecommendedAction } from "./contract.js";

const SEVERITY: Record<string, number> = { HIGH: 90, MED: 60, LOW: 30, NONE: 5 };
const CLASS: Record<string, string> = { hostile: "HOSTILE", friendly: "FRIENDLY", neutral: "NEUTRAL" };

/** Publish one Aegis-Edge air track (+ its ROE decision) as a domain-agnostic threat the partner
 *  dashboard can rank against sea / land / cyber threats. Friendlies are HOLD_FRIENDLY, low severity. */
export function toC2Event(
  track: Track, decision: EngagementDecision, tick: number, sessionId = "aegis-edge",
): CrossDomainThreat {
  const action: RecommendedAction =
    track.faction === "friendly" ? "HOLD_FRIENDLY"
    : decision.shooter ? "RECOMMEND_DEFEAT"
    : track.faction === "hostile" ? "TRACK" : "MONITOR";
  return {
    schema: "jadc2-threat.v1",
    id: track.id,
    domain: "air",
    source: "aegis-edge",
    classification: CLASS[track.faction] ?? "UNKNOWN",
    severity: track.faction === "hostile" ? (SEVERITY[track.threat] ?? 50) : 5,
    confidence: track.faction === "hostile" ? 0.9 : 0.99,
    pos: { x: track.pos.x, z: track.pos.z },
    recommendedAction: action,
    requiresHuman: decision.requiresHuman || action === "RECOMMEND_DEFEAT",
    rationale: decision.rationale,
    ts: tick,
    sessionId,
  };
}

/** A local order derived from the partner C2's tasking. Human authority is preserved end-to-end
 *  (defence in depth): an upstream ENGAGE only proceeds if the C2 met its two-person rule, and even
 *  then our node re-gates locally whenever a human seat exists — machine-execution is allowed only in
 *  a pre-authorized, unmanned envelope. */
export interface LocalOrder {
  trackId: string;
  engage: boolean;                 // fire now?
  requiresLocalApproval: boolean;  // pause on our human gate first?
  note: string;
}
export function fromC2Tasking(t: EngagementTasking, localHasHumanSeat: boolean): LocalOrder {
  if (t.action !== "ENGAGE")
    return { trackId: t.trackId, engage: false, requiresLocalApproval: false, note: `C2 tasking: ${t.action}` };
  if (!t.twoPerson)
    return { trackId: t.trackId, engage: false, requiresLocalApproval: true,
      note: "C2 ENGAGE rejected — two-person rule not satisfied upstream" };
  return localHasHumanSeat
    ? { trackId: t.trackId, engage: false, requiresLocalApproval: true,
        note: "C2-authorized; awaiting local operator confirm (defence in depth)" }
    : { trackId: t.trackId, engage: true, requiresLocalApproval: false,
        note: "C2-authorized; machine-executed inside the pre-authorized envelope" };
}
