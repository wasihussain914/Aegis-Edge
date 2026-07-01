/**
 * Cross-domain federation contract — the shared "language" for a Best-Collaboration integration.
 *
 * Aegis-Edge (this project) is a C-UAS AIR-DEFENSE node. The partner project (Team Akshaya) is a
 * multi-domain threat-prioritization C2 dashboard for a convoy / ship. Federated, they form a mini
 * JADC2 (Joint All-Domain Command & Control): our node emits governed AIR threats into their
 * cross-domain picture; their operator's approved tasking flows back to our human-gated engagement.
 *
 * Pure data, transport-agnostic — carried over AWS EventBridge / IoT Core between the two systems.
 * Both sides keep a human in the loop; the LLM (Bedrock/Claude) only explains, never authorizes.
 */
export type ThreatDomain = "air" | "sea" | "land" | "cyber" | "space";
export type RecommendedAction = "MONITOR" | "TRACK" | "RECOMMEND_DEFEAT" | "HOLD_FRIENDLY";

/** An Aegis-Edge air track + its governed recommendation, normalized for cross-domain prioritization. */
export interface CrossDomainThreat {
  schema: "jadc2-threat.v1";
  id: string;
  domain: ThreatDomain;         // "air" from Aegis-Edge
  source: string;               // emitting node, e.g. "aegis-edge"
  classification: string;       // HOSTILE / FRIENDLY / NEUTRAL / UNKNOWN
  severity: number;             // 0..100 — the common axis the dashboard ranks across domains
  confidence: number;           // 0..1
  pos?: { x: number; z: number };
  recommendedAction: RecommendedAction;
  requiresHuman: boolean;       // a human gate is required before any effect
  rationale: string;            // plain-English (LLM off the kill chain — explains, does not decide)
  ts: number;
  sessionId: string;
}

export type TaskingAction = "ENGAGE" | "HOLD" | "MONITOR";

/** A prioritized tasking the partner C2 sends back after its operator approves an option. */
export interface EngagementTasking {
  schema: "jadc2-tasking.v1";
  trackId: string;
  action: TaskingAction;
  authorizedBy: string;         // operator identity — federated across both systems via Okta
  twoPerson: boolean;           // separation-of-duties satisfied on the C2 side
  priority: number;             // 1..N cross-domain priority from the dashboard
  ts: number;
}
