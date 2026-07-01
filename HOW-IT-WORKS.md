# How Aegis-Edge works

The design thesis: **machine-speed decisions, a human authorizes every kill, and the LLM is kept off
the kill chain.** The parts that must be *trusted* are deterministic and auditable; the LLM only explains.

## The governed loop (one track, end to end)

```
sensors ──▶ IMM tracker ──▶ deterministic classifier ──▶ ROE gate ──▶ human gate ──▶ effector
 (radar/RF/EO-IR)  (where + closing)   (what is it?)     (what to do?)  (approve)     (defeat)
                                                              │
                                                              └──▶ hash-chained ledger ──▶ S3 WORM
                                                              └──▶ Amazon Bedrock (explains, async, OFF the chain)
```

1. **Sense.** Radar / RF / EO-IR produce measurements. (Real modalities — see `DATASETS.md`.)
2. **Track.** A real **IMM (Interacting Multiple Model)** estimator — a bank of Kalman filters blended by
   likelihood — tracks each object through maneuvers and predicts its closest-point-of-approach.
   *This is statistical estimation, not deep learning.*
3. **Classify — "is it a threat?"** A **deterministic, weighted-feature** classifier scores measurable
   features (RCS, altitude, speed, RF emitter type, thermal-quad signature, valid transponder,
   inside-no-fly) into a class + threat level. **Transparent rules, not a black box** — you can read the
   per-feature weights. A valid ADS-B / Remote-ID transponder → COOPERATIVE → hard-blocked, never engaged.
4. **Decide — "what do we do?"** The **ROE gate** applies Weapons-Control-Status, positive-ID and
   fratricide checks, then picks the **cheapest in-range effector** across the units (RF Zapper →
   SLAMRAAM → SHORAD) and whether a human is required. **Measured at ~0.58 µs.** (`npm run bench`)
5. **Authorize.** A **two-person human gate** must approve — unless the operator has pre-armed a bounded
   Autonomous envelope (machine-speed inside strict limits, still logged).
6. **Act + record.** The effector is tasked (SAPIENT / BSI Flex 335 shape); every action is hash-chained
   into an **Ed25519-signed ledger** on **S3 Object-Lock (WORM)**.
7. **Explain.** **Amazon Bedrock (Claude)** turns the tracks + ledger into a plain-English assessment
   report — *after* the gate decides, async and throttled. **There is no code path from the model to an
   effector.**

## Cooperative defense (the linking layer)
Two units — a Marine Beachhead and an Army Tank Column — each hold part of the picture. They fuse over
**Link-16** into one air picture; one unit can engage what the *other* sees (shoot-and-shout stands the
partner down). See `src/coop/`.

## DDIL resilience
Under jamming / degraded comms, radars go blind and threats drop to **TRACK LOST**; the gate keeps
governing **locally at the edge with no cloud** (the "edge-autonomous" state); the instant sensing
returns, the system reacquires and defeats them. Cross-unit pictures degrade gracefully → self-protect →
re-fuse.

## Edge vs. cloud
- **Edge** (AWS IoT Greengrass on Snowball-class hardware): tracker + gate + ledger. Offline-capable.
- **Cloud** (AWS GovCloud, IL5 target): Bedrock (report), S3 Object-Lock (ledger), KMS, IAM + IoT Token
  Exchange (no keys on the device), CloudWatch. See `public/aws-diagram.html`.

## Code map
| Path | What it is |
|---|---|
| `src/model/threatCall.ts` | Deterministic weighted-feature classifier (the "is it a threat" model). |
| `src/coop/coordination.ts` | Sensing, Link-16 fusion, ROE shooter selection, approval gate, comms health. |
| `src/coop/engagement.ts` | Per-tick engagement planning + shoot-and-shout. |
| `src/data/scenario.ts`, `src/data/coopScenario.ts` | Deterministic scenario data + unit/track motion. |
| `src/collab/` | JADC2 federation contract + adapter (partner C2 interop). |
| `bridge/bedrock.mjs`, `src/narrate.ts` | Bedrock (SigV4) explanation path, with offline fallback. |
| `scripts/bench-gate.ts` | Gate-latency benchmark (`npm run bench`). |

## Why deterministic?
You cannot accredit a black box that decides to fire. A deterministic classifier + gate is auditable
line-by-line, reproducible (same inputs → same outputs — 56 tests), and microsecond-fast off any network
path. The intelligence that's *hard* (tracking) is the IMM; the intelligence that must be *trusted* (the
engage decision) is deterministic; the model that *explains* is the LLM, kept off the trigger.
