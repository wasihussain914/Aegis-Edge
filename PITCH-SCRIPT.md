# Aegis-Edge — 10-Minute Pitch Script

**Format:** demo-first. ~2 min framing → ~6 min live demo → ~2 min architecture/security/future/close.
**Rubric coverage:** [1] Innovation 25% · [2] Working Solution 30% · [3] Architecture 20% · [4] Security 15% · [5] Docs/Path 10%.
Deck: `/pitch.html` · Diagram: `/architecture.html` · Sim: `/` (the live tunnel).

---

## 0:00–0:35 — HOOK  ·  [1] Innovation
> "Drone swarms now move faster than any human can authorize a shot. The enemy jams your comms so your systems go blind. And 'let an AI decide to pull the trigger' is a non-starter for any government that actually wants to field it.
>
> **Aegis-Edge solves all three.** We make counter-drone decisions at machine speed with a deterministic engine, a human authorizes every kill, and the large language model is deliberately kept **off the kill chain** — it explains decisions, it never makes them.
>
> Everyone else is racing to put AI *in* the loop. We engineered it *out* — and that's exactly what makes this accreditable and fieldable."

## 0:35–1:15 — WHY IT'S DIFFERENT  ·  [1] Innovation
> "Three things set us apart from what's in the market today:
> 1. **The LLM is off the kill chain** — a deterministic gate decides in under a millisecond; the model only narrates *after*.
> 2. **Cooperative, multi-unit defense** — two different units fusing their sensors and negotiating who shoots. Almost every C-UAS demo is a single site.
> 3. **Built for jamming** — we assume denied and degraded comms and show the system stay in the fight.
>
> We're not competing on a better detector. We're competing on a **governable, jam-resilient, cooperative architecture.** Let me show you."

---

## 1:15–7:30 — LIVE DEMO  ·  [2] Working Solution  (the majority of your time)
*(Switch to the sim. Narrate as you drive. Drop metrics as they appear.)*

**Beat 1 — Detect → classify → human-gated kill** *(default Manual mode)*
> "Here's our protected site. This contact is coming in from the edge — right now it's an unknown grey blip. As it crosses into sensor range... *(it turns red)* ...our edge classifier positively IDs it as a hostile drone. Nothing fires until I authorize it. I approve — *(click APPROVE)* — effector defeats it. Every step is logged."

**Beat 2 — Cooperative engagement** *(let the column close so Link-16 fuses)*
> "Now the joint picture — a Marine beachhead and an Army tank column, each with their own radar. As the column closes, Link-16 fuses their pictures — watch the convoy turn blue to match the base: one shared air picture. When a threat appears the system negotiates *who* shoots — it picks the **cheapest in-range effector by ROE**, and the other unit stands down. Cooperative defense, not two systems fighting alone."

**Beat 3 — Swarm saturation → pre-authorized auto-defense**
> "Now a saturating swarm — twenty drones. Past about six simultaneous threats, no human can gate each one. So the operator pre-authorizes a **bounded auto-defense envelope**, and the deterministic gate engages at machine speed — and every single action is still hash-chained into the audit ledger."

**Beat 4 — DDIL: jam it** *(press R for radar-down, or J for the jammer)*
> "Here's the contested piece. The enemy jams our sensors. Watch — the radars go blind, and the threats — 0427, 0318 — **drop off the picture: TRACK LOST.** We literally cannot see or shoot them.
> But look at this banner: **COMMS DENIED → EDGE-AUTONOMOUS.** The decision engine keeps running locally on the edge — no cloud, no internet — it just has nothing to shoot until sensing returns."

**Beat 5 — Recover (the money shot)**  *(release R / clear the jam)*
> "And the moment sensing comes back — watch — the system **reacquires the threats it couldn't touch and defeats them automatically.** *(the drones burst)* That's resilience: jamming didn't beat us, it just delayed us. We degrade gracefully and stay in the fight."

**Land the point:**
> "That's the whole thesis in ten seconds — blind us, and the edge holds the line and finishes the job the instant it can see again."

**Metrics — say these out loud during the demo:**
> "Every decision is **under a millisecond**. Under **0.1% false-positive** against friendly aircraft — by construction: anything squawking ADS-B or Remote ID is classified cooperative and hard-blocked. And this is tested — **45 automated tests, all green.** This is a running governed loop, not a mockup."

**AWS-effectiveness line — say it when the assessment panel appears:**
> "That threat assessment is **Anthropic's Claude, running on Amazon Bedrock** — but notice it came *after* the decision. The model explains; it never gates the shot."

---

## 7:30–8:15 — ARCHITECTURE  ·  [3] Architecture & Integration
*(Switch to /architecture.html)*
> "Here's how it's built. **The edge decides; the cloud explains and remembers.**
> On the **edge** — AWS IoT Greengrass on a Snowball Edge — the deterministic gate, the tracker, and the signed ledger. It runs **offline**; that DDIL resilience you just saw *is* this edge/cloud boundary made real.
> In the **cloud** — AWS GovCloud at IL5 — Bedrock with Claude for assessment, S3 Object-Lock for the immutable ledger, KMS and IAM.
> Sensors and effectors integrate through **SAPIENT — the open C-UAS interoperability standard** — so partners plug straight in. The core is pure and testable; the console only draws what the core decides. Clean, modular seams."

**Partner stack (flash the diagram rails, ~20s):**
> "Claude via Bedrock is live today. Around it we integrate the enterprise stack: **Okta** enforces our two-person authorization, **Datadog** watches the sub-millisecond gate, **GitLab** runs the tests and ships the edge, **Red Hat** and **Spectro Cloud** run and scale it, **Elastic** makes the audit searchable, **Rapid7** secures the platform itself."

## 8:15–8:55 — SECURITY & FEASIBILITY  ·  [4] Security & Feasibility
> "Security and compliance are built in, not bolted on: a **hash-chained, Ed25519-signed audit ledger** on write-once S3; **two-person authorization**, positive-ID and fratricide checks; GovCloud IL5, KMS, IAM.
> And here's the feasibility argument that matters: **a black box that decides to fire is nearly impossible to accredit — a deterministic gate you can audit line by line is fieldable.**
> It scales and stays cheap: the gate is sub-millisecond, and the LLM is async and throttled to narrate a *sample* — so **cost doesn't grow with threat volume.**"

## 8:55–9:40 — PATH FORWARD  ·  [5] Documentation & Path Forward
> "We're explicit about what this is: a prototype on a synthetic tactical scenario, with real-data validation on an edge run over public drone telemetry. That honesty is documented in the repo.
> The path to fielding is concrete:
> **Phase 1** — wrap real radar, RF and EO/IR plus effectors behind SAPIENT and deploy the core as a Greengrass component on-site.
> **Phase 2** — the GovCloud IL5 backplane: Bedrock, S3 WORM, KMS, IAM.
> **Phase 3** — a live-range pilot and accreditation, using the auditable kill chain to drive the ATO.
> **Phase 4** — multi-site federation, PACE comms fallback, and bandwidth-prioritized sharing.
> And you can replicate the whole PoC today: clone the repo, `npm test` — 45 green — `npm run dev`. The SAPIENT adapter is the single integration seam."

## 9:40–10:00 — CLOSE
> "Machine speed. Human authority. The LLM off the trigger — and it keeps fighting when the comms are gone. That's Aegis-Edge.
> It's running live right now, the code and architecture are on GitHub, and we'd love a pilot partner to take it to the range. Thank you."

---

### Metrics to memorize
`<1 ms gate · <0.1% FP vs friendly · 45/45 tests · 20-drone saturation swarm · edge-autonomous under DDIL`

### If a criterion feels light, add one sentence:
- **[2] tested/validated** → "Same governed loop, 45 tests, deterministic — same inputs, same outputs, every time."
- **[3] partner integration** → "One interface — SAPIENT — is all a sensor or effector vendor needs."
- **[4] scale** → "Sub-ms gate, throttled LLM off the critical path — it scales per-site horizontally."
- **[5] cost** → "The expensive part, the LLM, is bounded and off the hot path — cost is flat as threats rise."
