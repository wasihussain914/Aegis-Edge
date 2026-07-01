# Collaboration Brief — Aegis-Edge × Convoy C2 (Best Collaboration)

*Branch: `collab/convoy-c2` · proposed integration with Team Akshaya's project.*

## The pitch in one line
Two teams, one **mini JADC2**: their **multi-domain threat-prioritization C2 dashboard** is the brain
for a convoy/ship; our **Aegis-Edge** is the C-UAS air-defense spoke. They federate over one shared
contract — humans in the loop on both ends, the LLM off the kill chain on both ends, all on AWS.

## Why the two projects fit (complementary, not overlapping)
- **Their system** detects physical threats across domains, ranks them by severity, generates options,
  keeps a human in the loop, and pushes the approved solution to the convoy — fast.
- **Our system** owns the hard, specialized **air/drone** problem: real IMM tracking, a deterministic
  ROE gate, human-gated defeat, and DDIL resilience at the edge.
- Neither duplicates the other. Ours is the **sensor-shooter node**; theirs is the **cross-domain C2**.
  Plugged together, air threats become one line item in their prioritized picture, and their operator's
  approved tasking comes back to our governed engagement. That's exactly the DoD **JADC2** vision.

## The seam (real, in code — `src/collab/`)
- `contract.ts` — the shared messages: **`jadc2-threat.v1`** (our air track + severity + recommended
  action + rationale) and **`jadc2-tasking.v1`** (their approved, prioritized tasking).
- `federation.ts` — `toC2Event()` publishes our tracks into their picture; `fromC2Tasking()` accepts
  their tasking and **re-gates it locally** (defence in depth: an upstream ENGAGE only proceeds if the
  C2 met its two-person rule, and even then our node still requires a local operator unless it's in a
  pre-authorized unmanned envelope).
- `federation.test.ts` — 5 tests proving the round-trip and the governance guarantees.

Sample `jadc2-threat.v1` our node emits:
```json
{ "schema":"jadc2-threat.v1","id":"HOSTILE-2","domain":"air","source":"aegis-edge",
  "classification":"HOSTILE","severity":90,"confidence":0.9,"recommendedAction":"RECOMMEND_DEFEAT",
  "requiresHuman":true,"rationale":"cheapest in-range effector by ROE","ts":42,"sessionId":"aegis-edge" }
```

## Where the sponsors slot in (the joint stack)
- **AWS EventBridge / IoT Core** — the interop transport carrying the shared contract between systems.
- **Anthropic Claude (Bedrock)** — explains *why* the air threat ranks where it does, cross-domain
  (off the kill chain on both ends).
- **Okta** — one federated operator identity across both systems, so a convoy operator's approval and
  the two-person rule hold end-to-end.
- **Elastic** — the shared, searchable common operating picture: both teams' tracks + decisions in one
  index for after-action and analytics.
- **Datadog** — one observability pane over both teams' services (latency, the <1 ms gate, Bedrock).
- **Rapid7 / Red Hat / Spectro Cloud / GitLab / IBM** — secure, harden, deploy, and scale the joint
  edge+cloud fleet.

## Why this wins "Best Collaboration"
1. **A real, defined interface** — not two demos on one stage; a working schema + adapter + tests.
2. **Genuinely complementary** — C2 brain + air-defense shooter = one kill-web, the JADC2 story judges
   already care about.
3. **Shared principles reinforce each other** — human-in-the-loop and LLM-off-the-kill-chain on *both*
   ends, with defence-in-depth two-person checks across the seam.
4. **Sponsor-native** — the collaboration is the thing that actually needs EventBridge, Okta federation,
   Elastic, and Datadog, so the sponsor usage is real, not bolted on.

## 30-second talk track
> "We teamed with [Team Akshaya] to prove interoperability. Their multi-domain C2 dashboard is the
> brain; our Aegis-Edge is the counter-drone shooter. We defined one shared contract — a JADC2-style
> threat and tasking message — so our air tracks flow into their prioritized picture, and their
> operator's approved tasking comes back to our human-gated engagement, re-checked locally for
> two-person authority. It's a mini JADC2, humans in the loop end to end, carried on AWS EventBridge
> with one Okta identity across both systems."
