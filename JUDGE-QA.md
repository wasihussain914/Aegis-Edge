# Judge Q&A Prep — Aegis-Edge

**Framing to know cold:** the project is *two layers*.
- **3D sim (this repo)** = the presentation / demo layer — a governed loop on a clearly-labeled *synthetic tactical scenario*.
- **`wolfberg-platform`** = the substance — a **real IMM tracker** (`filterpy IMMEstimator`) over **real Kaggle drone telemetry**, the deterministic ROE gate, a **hash-chained Ed25519 audit ledger** (WebCrypto), **SAPIENT** effector tasking, and **Amazon Bedrock** assessment (SigV4).
- One system, two views: same gate + ledger spine.

If a judge doubts realism, point to the platform: *"the tracker is a real Interacting-Multiple-Model estimator running on real drone telemetry, not a scripted path."*

---

## A · "Prove it's real"

**Q: Is the detection/tracking real or scripted?**
> Real. The tracker is an Interacting Multiple Model estimator — the standard for maneuvering air targets — two Kalman filters (steady + maneuver) blended by likelihood each step, run over the public Kaggle drone-trajectory dataset. The maneuver probability you see is the IMM's, not a script.

**Q: Is your scenario data real?**
> The tactical *scenario* in the demo is synthetic and labeled as such — real Kaggle hobby telemetry over a 5 km AO looks absurd, so we drive a realistic ingress scenario through the **same** governed loop. The real-data proof is the edge IMM run on the actual telemetry. We're explicit about that split in the repo. *(⚠ honesty: don't claim the scenario itself is real.)*

**Q: What did you actually test?**
> 45 automated tests on the deterministic core — the governed loop *is* the test suite — plus ledger and policy tests in the platform. Same inputs, same outputs, every run; that determinism is what makes it testable and certifiable.

---

## B · The LLM-off-the-kill-chain claim (they WILL push here)

**Q: If the LLM doesn't decide, why have it at all?**
> Two jobs, both off the trigger: it writes the plain-English threat assessment an operator reads, and it can narrate a sample of a swarm for situational awareness. The *decision* is a deterministic ROE gate. The model explains; it never authorizes.

**Q: How do you *guarantee* the model can't influence a shot?**
> Architecturally, not by policy. The gate takes the IMM track + ROE state and returns the decision; the Bedrock call is a separate, async, throttled path whose output only ever reaches the operator's display and the ledger. There is no code path from the model's tokens to an effector command. *(true — the effector task is built only from the gate's authorization.)*

**Q: Isn't a deterministic gate just a dumb rules engine?**
> Yes — deliberately. For a kill decision you *want* auditable, repeatable rules a human can inspect and an authority can accredit, not a probabilistic black box. The intelligence that's hard — maneuver tracking — is the IMM; the intelligence that must be trusted — the engage decision — is deterministic.

---

## C · AWS & edge/cloud

**Q: What exactly runs at the edge vs the cloud?**
> Edge: the IMM tracker, the deterministic gate, effector tasking, and the signed ledger — on AWS IoT Greengrass (a small core, EC2 t3.small class), able to run fully offline. Cloud: Amazon Bedrock for assessment, S3 Object-Lock for the immutable ledger, KMS and IAM — targeted at GovCloud IL5.

**Q: Show me AWS actually being used.**
> Bedrock is called live via a hand-rolled SigV4 request (`bridge/bedrock.mjs`) — click any track and the assessment panel fills from Bedrock, with an offline template as fallback. The edge/cloud split and services are in the architecture diagram.

**Q: Is it deployed on GovCloud IL5 today?**
> IL5 is the **target** accreditation environment, not a live deployment — we architected to it (WORM ledger, KMS, IAM, IL5 region). Phase 2 stands up that backplane. *(⚠ honesty: say "targeted," not "running on IL5.")*

---

## D · Security & accreditation

**Q: How is the audit trail tamper-evident?**
> A hash-chained ledger where each entry signs the previous hash with Ed25519 (WebCrypto), written to S3 Object-Lock (WORM). Break any link and verification fails. It's tested in the platform core.

**Q: What's your realistic path to an ATO?**
> The determinism is the lever — an auditable, repeatable kill chain is far easier to accredit than a model that decides to fire. Two-person authorization, positive-ID, and fratricide checks are documented controls; Phase 3 is a controlled range pilot driving the ATO.

**Q: What stops a friendly from being engaged?**
> A cooperative contact — valid ADS-B or Remote ID — is classified COOPERATIVE and hard-blocked (HOLD_FRIENDLY); it can never be armed or auto-engaged. That's the <0.1% false-positive-vs-friendly guarantee, by construction. *(⚠ caveat to volunteer: that covers transponder-equipped friendlies; a non-cooperative friendly falls to the human gate and recommend-only posture.)*

---

## E · Scale, performance, cost

**Q: You claim <1 ms — how measured?**
> It's a pure, synchronous function — no I/O, no model call — so it's microseconds-to-sub-millisecond in practice; we can drop a benchmark in. The point is it's off any network path, unlike a model call. *(⚠ honesty: it's an architectural claim, trivially measurable, not a formal profile yet.)*

**Q: Does it scale to a real swarm?**
> The gate is sub-ms so it scales with track count; past a saturation threshold the operator pre-authorizes a bounded auto-defense envelope and it engages at machine speed, every action still logged. The LLM is async and throttled — it narrates a sample, so it never bottlenecks.

**Q: What's the cost model?**
> The expensive part — Bedrock — is off the hot path and throttled to a sample, so **cost is roughly flat as threat volume rises**. The deterministic gate is near-free; WORM storage is cheap. Cost scales with sites, not with drones.

---

## F · Differentiation

**Q: How is this different from Anduril / DroneShield / Fortem?**
> We're not competing on the sensor or the detector. We're differentiating on **governance and resilience**: LLM provably off the kill chain, cooperative multi-unit engagement, and DDIL-first design that keeps deciding at the edge when comms are denied. It's the accreditable, jam-resilient control layer that sits *on top of* any sensor/effector via SAPIENT.

**Q: Why would a vendor integrate with you?**
> One interface — SAPIENT / BSI Flex 335, the open C-UAS standard. A sensor or effector vendor conforms once and plugs in; our core is I/O-free and doesn't care whose hardware it is.

---

## G · Sponsors (if asked "how did you use X?")

> **Anthropic / Claude on Bedrock** is live today — the assessment layer, deliberately off the kill chain. The rest is the enterprise stack we **integrate** (say "integrate," not "built with"): **Okta** for identity + the two-person rule, **Datadog** for the <1 ms gate SLO and Bedrock cost, **GitLab** for CI/CD of the edge components, **Red Hat** for the hardened edge OS, **Spectro Cloud** for the edge K8s fleet, **Elastic** for a searchable audit, **Rapid7** to secure the platform itself, **IBM** watsonx for model governance.

---

## H · Curveballs / hardest

**Q: What's the biggest weakness / what would break first?**
> Honestly: live sensor integration. The governed loop and the tracker are real, but we haven't wired physical radar/RF/EO-IR yet — that's Phase 1 via SAPIENT. We led with the decision architecture because that's the hard, differentiating part; the sensor plumbing is known engineering.

**Q: What if the operator just rubber-stamps every gate?**
> Then you've made a human-factors choice, and the ledger records exactly who authorized what and when — that accountability is the deterrent. The system's job is to make the *right* decision cheap to approve and a *wrong* one impossible to hide. Autonomous mode exists only inside a pre-authorized, bounded envelope that itself took two people to arm.

**Q: What happens if the edge box is captured or spoofed?**
> The ledger is signed and chained, so tampering is detectable; keys are in KMS; and Rapid7-class endpoint security + Red Hat hardening are in the platform layer. A captured node can't rewrite history without breaking the chain.

**Q: Why should a government trust an AI company's model near weapons at all?**
> They shouldn't — which is the whole design. We put the model where it's safe (explanation) and kept it out of where it's dangerous (the trigger). That's a feature we'd defend to any oversight body.

**Q: What did you learn building it?**
> That the LLM's latency and cost *forced* it off the critical path — and that constraint turned out to be the correct safety posture. The limitation became the differentiator.

---

### One-line honesty guardrails (memorize)
- Scenario = synthetic; **tracker + telemetry = real (IMM over real data)**.
- IL5 / GovCloud = **targeted**, not deployed.
- Sponsors = **integrated** architecture; only **Anthropic/Claude is live**.
- <0.1% FP = by construction, **cooperative traffic only**.
- <1 ms = pure-function claim, **measured at ~0.58 µs** (`npm run bench`).

---

## v2 — sharpest answers (the exact framings)

**Q: What kind of model decides which drones to engage?**
> A **deterministic weighted-feature classifier — transparent rules, not a neural network** — by design,
> for explainability and accreditation. The ML in the system is the **IMM** (statistical tracker) and a
> **trained image classifier** for the optical modality; the LLM only explains.

**Q: The 0.58 µs — that's detection speed?**
> No — the **engagement decision** once a track is classified (who shoots, what, human-or-not).
> Detection/tracking is the IMM, a separate step. 0.58 µs is measured over 200k runs.

**Q: How does the "AI" decide what's a threat and what to do?**
> Two deterministic stages: a rules-based classifier (sensor features → threat), then a ROE gate
> (cheapest in-range effector, positive-ID, fratricide, two-person). The LLM is off both — it explains.

**Q: Walk me through your datasets / did you train end-to-end?**
> Four real modalities — RF (DroneRF), thermal (HIT-UAV), cooperative ADS-B (adsb.lol, OpenSky),
> linking (Cursor-on-Target) — validated against real Ukraine UAV-strike data. Optical model is trained;
> tracker is an IMM over real telemetry; engagement classification is deterministic rules. **No
> end-to-end black-box training.** See `DATASETS.md`.

**Q: Fiber-optic FPV beats RF jamming — how do you handle it?**
> We don't depend on RF: thermal + radar still detect it, and when the gate sees no RF emitter it
> **escalates the effector from jamming to kinetic automatically.** We planned for the counter-counter.

**Q: Which parts did *you* build?**
> The 3D tactical sim, the cooperative + DDIL engagement logic, and the integration this window; the 2D
> operator console is my teammate **Berg's**; it builds on our prior governed-runtime platform, disclosed
> in the repo.

**Q: 3D engine? Why?**
> **three.js / WebGL**, TypeScript + Vite, all procedural geometry — the demo is a URL in any browser,
> no install, loads instantly.
