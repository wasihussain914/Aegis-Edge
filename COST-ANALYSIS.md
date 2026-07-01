# Aegis-Edge — Big-Picture Cost Analysis (Path to Real)

> All figures are **order-of-magnitude estimates from public sources** (see Sources). C-UAS hardware
> pricing varies ~10× by class; AWS MDC/Outposts pricing is contract-negotiated under JWCC, not public.

## 0 · The one insight that frames everything
**The money is in the sensors and effectors — not in our software or the cloud.** A complete C-UAS
site is dominated by radar/RF/EO-IR/effector hardware. Our IP — the deterministic governance +
resilience layer — is the *cheap, high-leverage* part that rides on top of hardware the customer or a
partner already buys. So the smart play is **capital-light software + integration**, priced per site,
sitting on **open (SAPIENT) sensors** and **AWS edge** we don't have to build.

Corollary: our **marginal cost per additional site is tiny** (a sensor kit + a little opex), because
the deterministic gate is near-free and the LLM is throttled off the hot path — **cloud cost is flat
as threat volume rises.** That's the criterion-5 optimization story.

---

## 1 · Per-defended-site CAPEX (one-time hardware)
Tiered — a fixed base looks very different from a mobile convoy overwatch.

| Component | Light (mobile/FOB) | Standard (fixed site) | Heavy (installation) |
|---|---|---|---|
| C-UAS radar (AESA, Echodyne-class) | $50–150k (compact) | $150–400k | $400k–1M+ (multi-face) |
| RF detect/DF (emerging low-cost → DF-grade) | $1–10k | $10–50k | $50–150k |
| EO/IR gimbal (thermal + daylight) | $30–80k | $80–150k | $150–300k |
| Acoustic mesh (optional mass, cheap) | — | <$500/node × N | <$500/node × many |
| Effector (non-kinetic RF-defeat first) | $30–100k | $100–300k | $300k–1M+ (HPM area) |
| Edge compute (our core is tiny) | Snowball Edge $10–30k | ruggedized server $10–40k | **AWS MDC** (see §5) |
| Integration + install + siting | $30–80k | $80–200k | $200–500k |
| **Per-site total** | **~$150–450k** | **~$500k–1.5M** | **~$1.5–5M+** |

*Reference anchor:* a complete Sentrycs-class C-UAS system is **~$250–400k**; a handheld is ~$65k.
Our software layer is a **single-digit %** of any of these.

## 2 · Per-site OPEX (recurring / year)
| Item | Est. $/site/yr | Note |
|---|---|---|
| AWS cloud (Bedrock throttled, S3 WORM, KMS, Greengrass compute, CloudWatch, GovCloud) | $5–30k | **small — off the hot path** |
| Partner SaaS allocated per site (Datadog, Okta, Elastic, Rapid7, Red Hat, Spectro, GitLab) | $10–50k | scales with fleet, not threats |
| Hardware maintenance / spares (~10–15% of capex) | $30–200k | the real recurring driver |
| Comms / bandwidth | low | edge-autonomy cuts this |
| **Per-site opex** | **~$50–250k/yr** | dominated by hardware upkeep |

## 3 · Program-level ONE-TIME (amortized across the whole fleet, not per site)
| Item | Est. | Timeline |
|---|---|---|
| Productization eng. (SAPIENT integration, hardening, live sensor wiring) | $1.5–4M | 12–18 mo · 4–8 engineers |
| Accreditation — RMF/ATO, IL5, 3PAO assessment | $250k–1M+ | 9–18 mo |
| Range pilot / T&E with real effectors | $250k–1M | 3–6 mo |
| **Program one-time** | **~$2–6M** | — |

---

## 4 · Why the AWS cloud line is genuinely small (the optimization story)
- **Bedrock is off the kill chain and throttled to a sample.** If a site sees, say, ~5k assessments/
  month at ~$0.003–0.015/call, that's **~$15–75/month** — it does **not** scale with drone count,
  because the deterministic gate (near-zero cost) handles every track and the LLM narrates a sample.
- **The signed ledger is text on S3 Object-Lock** — pennies to low-dollars/month.
- **Greengrass core software is free**; you pay only for the small edge compute it runs on.
- Net: **cloud is ~1–5% of site TCO**, and **flat vs. threat volume** — the opposite of a per-
  inference AI system whose bill explodes under a saturating swarm.

## 5 · Edge compute options (map to deployment tier)
- **AWS Snowball Edge** — per mobile unit / small fixed site. Subscription-class, air-transportable.
- **AWS Outposts** — a rack for a fixed site needing more compute + low-latency cloud parity.
- **AWS Modular Data Center (MDC)** — a **ruggedized, air-transportable container** that hosts Outposts/
  Snow racks, **purpose-built for DDIL environments**, delivered under the **$9B JWCC** contract. This
  is the **installation/base** play: one MDC powers the whole site's C-UAS core *and* other JWCC
  workloads — and it's literally designed for the denied/degraded conditions our demo highlights.
  *(Pricing is JWCC-negotiated, not public.)*

## 6 · Unit economics at scale (the leverage)
| Fleet | Program one-time (amortized) | Per-site capex | Per-site opex/yr | Our software's share of TCO |
|---|---|---|---|---|
| 1 site | $2–6M (all on one site) | $0.5–1.5M | $50–250k | high (front-loaded) |
| 10 sites | ~$200k–600k/site | $0.5–1.5M | $50–250k | **~5–10%** |
| 100 sites | ~$20k–60k/site | $0.5–1.5M | $50–250k | **low single-digit %** |

**Takeaway:** at fleet scale our layer is a few percent of TCO while providing the accreditable
decision + DDIL resilience that makes the whole investment fieldable. We're the cheap keystone.

## 7 · Cost-optimization strategy (what we'd actually do)
1. **Ride open sensors (SAPIENT).** No vendor lock-in → competitively source radar/RF/EO-IR; mix
   **cheap acoustic/RF for mass coverage** with **radar for precision** — Ukraine proved <$500 nodes
   at scale work.
2. **Edge-autonomous by design** → less bandwidth, less cloud egress, survives DDIL for free.
3. **LLM off the hot path + throttled** → AI cost is bounded and flat, not per-track.
4. **Leverage existing vehicles** — JWCC / AWS MDC / GovCloud already accredited; we deploy *into*
   them instead of building infrastructure.
5. **Tiered kits** — Light/Standard/Heavy so a customer buys only the coverage a site needs.
6. **Capital-light business model** — we sell the software + integration per site; the customer or a
   hardware partner owns the sensors/effectors. High margin, low capex, scales with the
   **$2.5B → $30.3B (2035, 28.6% CAGR)** market.

## 8 · Honest caveats
- Estimates from public sources; real procurement is quote- and quantity-dependent (±large).
- Sensor/effector pricing spans ~10× by class and TRL; HPM/kinetic effectors run far higher than RF.
- AWS MDC/Outposts/GovCloud pricing under JWCC is contract-negotiated, not list-price.
- ATO cost/timeline depend on impact level and sponsor; IL5 is toward the top end.

### Sources
- AWS Modular Data Center for DoD (DDIL, JWCC): https://aws.amazon.com/blogs/publicsector/announcing-aws-modular-data-center-u-s-department-defense-joint-warfighting-cloud-capability/
- AWS MDC "What's New": https://aws.amazon.com/about-aws/whats-new/2023/02/aws-modular-data-center-mdc-us-department-defense-customers/
- C-UAS system cost buyer's guide (TCO/ROI): https://uav-defence.com/buyers-guide-how-much-does-a-counter-drone-system-cost-tco-roi-analysis/
- Echodyne / Trust Automation $490M USAF C-UAS radar contract: https://www.businesswire.com/news/home/20260420232780/en/
- Sentrycs C-UAS pricing (~$250–400k; handheld ~$65k): https://dronelife.com/2026/04/22/sentrycs-counter-uas-world-cup-contracts/
- Drone detection market size ($2.5B→$30.3B, 28.6% CAGR): https://www.marketsandmarkets.com/Market-Reports/drone-detection-market-199519485.html
