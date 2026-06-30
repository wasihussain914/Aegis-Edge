/**
 * Client bridge to the same-origin narration endpoint (R2.3).
 *
 * Sends the track features to `/api/narrate`, which re-runs the deterministic classifier and asks
 * Bedrock Nova to narrate. We NEVER trust the server for the classification: the threat call is
 * already computed locally and is authoritative. If the server's re-classification disagrees, or
 * the call fails / no creds, we fall back to the offline deterministic template. Bedrock can only
 * change the words, never the call.
 */
import { explainTemplate, type Classification, type TrackFeatures } from "./model/threatCall.js";

export type NarrationSource = "bedrock" | "offline";
export interface Narration { source: NarrationSource; text: string; }

/** Offline narration — the guaranteed, disconnected fallback. */
export function offlineNarration(k: Classification): Narration {
  return { source: "offline", text: explainTemplate(k) };
}

/**
 * Fetch a narration for an already-classified track. `local` is the authoritative client-side
 * classification; we only accept the server's prose if its re-classification matches it exactly.
 */
export async function fetchNarration(features: TrackFeatures, local: Classification): Promise<Narration> {
  try {
    const res = await fetch("/api/narrate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ features }),
    });
    if (!res.ok) return offlineNarration(local);
    const data = (await res.json()) as { source?: string; text?: string; classification?: Classification };
    // Guard the kill chain: if the bridge's classification drifted from ours, distrust its prose.
    const s = data.classification;
    const matches = s && s.class === local.class && s.threat === local.threat && s.score === local.score;
    if (!matches || !data.text) return offlineNarration(local);
    return { source: data.source === "bedrock" ? "bedrock" : "offline", text: data.text };
  } catch {
    return offlineNarration(local);
  }
}
