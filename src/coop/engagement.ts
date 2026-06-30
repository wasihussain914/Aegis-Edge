/**
 * Deterministic cooperative-engagement planner (Phase D). Pure, no three.js, no LLM.
 * Each tick the scene calls planEngagements() to resolve every hostile in the fused air picture:
 * who shoots (ROE cheapest in-range across both units), whether the operator-mode gate clears, and
 * shoot-and-shout — once a unit fires a track it joins `engaged` so the other unit stands down and
 * no one double-engages. This is the SINGLE source of truth for the event/negotiation log and the
 * in-scene fire/stand-down cues; the LLM never touches any of it (it may only re-phrase logLine).
 */
import { selectShooter, resolveEngagement, labelUnit, labelWeapon } from "./coordination.js";
import type { Unit, Track, OperatorMode, EngagementDecision, UnitId } from "./types.js";

/** Coarse status for the log/scene, derived purely from the core's EngagementDecision. */
export type EngagementStatus = "FIRE" | "HOLD" | "GATE" | "READY" | "NONE";

export interface EngagementOutcome {
  track: Track;
  decision: EngagementDecision;
  status: EngagementStatus;
  fired: boolean;            // cleared the gate this step (machine-authorized)
  standDown: UnitId | null;  // the OTHER unit that stands down on this track (shoot-and-shout)
  logLine: string;           // deterministic negotiation line (template; LLM may re-phrase only)
}

/** Map a resolved decision to its coarse status. */
export function statusOf(d: EngagementDecision): EngagementStatus {
  if (!d.shooter) return "NONE";
  if (d.approved) return "FIRE";
  if (d.blockedReason) return "HOLD";       // requires a human the current mode can't supply
  if (d.requiresHuman) return "GATE";       // requires a human; the mode HAS one → pauses on a gate
  return "READY";                           // machine-eligible, awaiting confirm per mode
}

function logLineFor(o: { track: Track; decision: EngagementDecision; status: EngagementStatus; standDown: UnitId | null }): string {
  const { track: t, decision: d, status, standDown } = o;
  const shooter = d.shooter ? labelUnit(d.shooter) : "";
  const weapon = d.weapon ? labelWeapon(d.weapon) : "";
  switch (status) {
    case "FIRE":
      return `${shooter} engages ${t.id} with the ${weapon} — machine-authorized, the cheapest in-range effector under ROE. ` +
        `${standDown ? labelUnit(standDown) : "The other unit"} stands down (no double-shot).`;
    case "HOLD":
      return `${shooter} would use the ${weapon} on ${t.id}, but it needs a human approver and this mode has none — holding.`;
    case "GATE":
      return `${shooter} is ready to engage ${t.id} with the ${weapon} — waiting on operator approval before it fires.`;
    case "READY":
      return `${shooter} can engage ${t.id} with the ${weapon} — confirm per the current operator mode.`;
    default:
      return `${t.id}: no unit has an in-range weapon (or the link is down) — no one can take the shot.`;
  }
}

/**
 * Resolve engagements for all hostiles in the fused picture this tick. Hostiles are processed in a
 * fixed order; a fire adds the track to `engaged` so a later hostile (and every subsequent tick)
 * sees the stand-down — `selectShooter` already excludes engaged tracks. Returns the outcomes plus
 * the updated `engaged` set to carry into the next tick. Pure: same inputs → same outputs.
 */
export function planEngagements(
  tracks: Track[], units: [Unit, Unit], link: boolean, mode: OperatorMode, alreadyEngaged: Set<string>,
): { outcomes: EngagementOutcome[]; engaged: Set<string> } {
  const engaged = new Set(alreadyEngaged);
  const outcomes: EngagementOutcome[] = [];
  for (const t of tracks) {
    if (t.faction !== "hostile") continue;
    const pick = selectShooter(t, units, link, engaged);
    const decision = resolveEngagement(t, pick, mode);
    const status = statusOf(decision);
    let standDown: UnitId | null = null;
    const fired = status === "FIRE";
    if (fired && decision.shooter) {
      engaged.add(t.id);
      standDown = decision.shooter === units[0].id ? units[1].id : units[0].id;
    }
    outcomes.push({ track: t, decision, status, fired, standDown, logLine: logLineFor({ track: t, decision, status, standDown }) });
  }
  return { outcomes, engaged };
}

/**
 * Plain-English engagement rationale for a clicked track (DOD-11). Deterministic template — the
 * Bedrock layer may rewrite the prose later but never the decision. Non-hostile tracks get a
 * who-would-not-engage line so the faction read is explicit.
 */
export function engagementRationale(
  track: Track, units: [Unit, Unit], link: boolean, mode: OperatorMode, engaged: Set<string>,
): string {
  if (track.faction !== "hostile") {
    return `${track.id} is ${track.faction.toUpperCase()} — ROE permits no engagement; both units hold fire.`;
  }
  const pick = selectShooter(track, units, link, engaged);
  return resolveEngagement(track, pick, mode).rationale;
}
