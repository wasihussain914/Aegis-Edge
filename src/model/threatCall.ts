/**
 * Threat-call model — deterministic edge classifier (NO LLM, <1ms, on the "kill chain"),
 * plus a Bedrock-style explanation hook (OFF the kill chain). Ported from the threat-call spec.
 *
 * The classifier never calls a network; it scores physical/RF/EO evidence into a class + threat
 * and logs the contributions that drove it. The explanation layer only narrates that result.
 */

export type TargetClass = "drone" | "bird" | "aircraft" | "clutter";
export type ThreatLevel = "NONE" | "LOW" | "MED" | "HIGH";

export interface TrackFeatures {
  trackId: string;
  rcsM2: number;          // radar cross-section (m^2): small = drone-like
  altM: number;           // altitude (m): low = drone-like
  speedMps: number;       // speed (m/s)
  rfEmitter: "none" | "commercial-uas-c2" | "wifi" | "telemetry";
  thermalQuad: boolean;   // EO/IR saw a quadrotor thermal signature
  friendlyTransponder: boolean; // cooperative (ADS-B / remote-id broadcast)
  insideNoFly: boolean;   // geometry: inside the protected no-fly volume
}

export interface Contribution { feature: string; weight: number; note: string; }

export interface Classification {
  trackId: string;
  class: TargetClass;
  threat: ThreatLevel;
  score: number;          // 0..1
  contributions: Contribution[];
}

/** Deterministic. Same input -> same output. No network, no LLM. */
export function classify(f: TrackFeatures): Classification {
  const c: Contribution[] = [];
  let score = 0;
  const add = (cond: boolean, w: number, feature: string, note: string) => {
    if (cond) { score += w; c.push({ feature, weight: w, note }); }
  };

  add(f.rcsM2 <= 0.15, 0.25, "rcs", `small RCS ${f.rcsM2} m² (drone-class)`);
  add(f.altM <= 200, 0.15, "altitude", `low altitude ${f.altM} m`);
  add(f.speedMps <= 25, 0.1, "speed", `slow ${f.speedMps} m/s (rotary-wing)`);
  add(f.rfEmitter === "commercial-uas-c2", 0.25, "rf", "commercial UAS C2 control-link signature");
  add(f.thermalQuad, 0.15, "eoir", "quadrotor thermal signature");
  add(f.insideNoFly, 0.1, "geometry", "track is inside the protected no-fly volume");
  // Cooperative aircraft strongly suppress threat.
  add(f.friendlyTransponder, -0.6, "transponder", "friendly transponder / remote-ID present (cooperative)");

  score = Math.max(0, Math.min(1, score));

  let cls: TargetClass;
  if (f.friendlyTransponder && f.rcsM2 > 1) cls = "aircraft";
  else if (f.rcsM2 > 0.5 && f.rfEmitter === "none" && !f.thermalQuad) cls = "bird";
  else if (f.rcsM2 <= 0.15 && (f.rfEmitter === "commercial-uas-c2" || f.thermalQuad)) cls = "drone";
  else cls = "clutter";

  let threat: ThreatLevel = "NONE";
  if (cls === "drone") {
    if (score >= 0.7 && f.insideNoFly) threat = "HIGH";
    else if (score >= 0.55) threat = "MED";
    else threat = "LOW";
  }
  return { trackId: f.trackId, class: cls, threat, score: Number(score.toFixed(3)), contributions: c };
}

/** Plain-language explanation. Off the kill chain: never alters the classification. */
export function explainTemplate(k: Classification): string {
  if (k.contributions.length === 0) return `${k.trackId}: no threat indicators; ${k.class}.`;
  const drivers = k.contributions
    .filter((x) => x.weight > 0)
    .map((x) => x.note)
    .join("; ");
  const suppress = k.contributions.find((x) => x.weight < 0);
  const tail = suppress ? ` Mitigating: ${suppress.note}.` : "";
  return `Track ${k.trackId} assessed ${k.class.toUpperCase()} / ${k.threat}. Evidence: ${drivers}.${tail}`;
}
