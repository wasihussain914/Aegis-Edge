# wolfberg-peraspera-hackathon

Wolfberg / Per Aspera entry for the **AWS Global Government Hackathon** (AWS Summit DC, June 29 to July 1, 2026).

## What this is

A **3D operator interface for autonomous, multi-layered counter-UAS defense of a 1 km² Forward
Operating Base** (challenge #8). It renders the live air picture in three dimensions — inbound
small-UAS tracks, cooperative air traffic, layered sensing/defense rings and a sensor-coverage
dome over the FOB — and drives every engagement through a deterministic ROE / Weapons-Control-Status
gate with a hash-chained governance ledger.

It is the 3D front end over the Wolfberg governed runtime: the same `cuas-events` data model, NED
sensor frame, IMM-style trajectory prediction (CPA + time-to-CPA), and the deterministic gate from
`wolfberg-platform/solutions/cuas`. The 2D operator console proved the loop; this is the spatial,
operator-facing view of it.

### What it does

- **Detect / track / classify** — every track is range/CPA/closing-rate scored each frame and
  classified `CLEAR → WARNING → CRITICAL` (CPA ≤ 150 m / ≤ 50 m), or `COOPERATIVE` for
  transponder-equipped (ADS-B / Remote ID) contacts.
- **Layered defense** — concentric detection (1 km), warning, and critical rings plus a translucent
  RF/radar coverage dome, rendered in 3D around the FOB.
- **Friendly deconfliction (the < 0.1% FP guarantee)** — cooperative contacts map deterministically
  to `HOLD_FRIENDLY` and are *un-engageable by construction*; the commit path is hard-guarded against
  fratricide. The live metrics panel recomputes the false-positive rate the way
  `solutions/cuas/docs/detection-fp-analysis.md` defines it (0 false engagements across the run).
- **Appropriate countermeasures, human-gated** — defeat is *recommend-only* under HOLD/TIGHT/FREE
  and only auto-tasked under an armed AUTO envelope (a two-person act). Non-kinetic (RF) first.
- **Auditable** — every posture change, positive-ID, and engagement is appended to a tamper-evident
  hash-chained ledger you can verify in the UI.

### Run it

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static, CSP-clean bundle in dist/ (S3/CloudFront or edge-served)
```

Toggle the **Single / Swarm** scenario and playback speed in the viewport; select any track to
review its assessment and (for non-cooperative threats) the engagement decision. Stack: React +
Vite + TypeScript, three.js via react-three-fiber / drei, zustand.

### How it maps to the evaluation criteria

- **Innovation** — a spatial, governance-first C-UAS picture: the kill-chain gate, two-person rule,
  fratricide guard, and audit ledger are *in the runtime*, not bolted-on UI.
- **Working solution** — runs end-to-end against the canonical swarm scenario with live detection/FP
  metrics; deterministic and reproducible.
- **Architecture** — edge-deterministic fast path (gate < 1 ms, no model in the loop) with the LLM
  assessment off the kill chain; static build deployable to the edge or CloudFront.
- **Security & feasibility** — recommend-only posture, two-person AUTO arming, cooperative
  deconfliction by construction, tamper-evident ledger.
- **Documentation & path forward** — this README + the inherited CUAS docs; limitations and next
  steps below.

### Limitations & path forward

- Sensing modeled here is **kinematic + cooperative-ID**; optical/acoustic/RF-spectral discrimination
  is designed in the platform but not wired into this view.
- Tracks are a **synthetic realistic-ingress scenario** through the real gate logic; real-data
  validation lives in the platform's edge Greengrass run on Kaggle drone telemetry.
- The in-browser ledger uses a compact synchronous hash chain; the fielded edge ledger is
  SHA-256 + Ed25519. **Next:** live-read the platform's NDJSON event stream, wire the optical
  discriminator as a fusion input, and add saturation/handling for >50-track swarms.

## Prior work vs built during the hackathon

This is a disclosure section, kept current through the event.

- **Built during the hackathon window (June 29 to July 1, 2026):** everything committed to this
  repository. The commit history reflects genuine in-window authorship.
- **Prior intellectual property this builds on (created before the event):**
  - `wolfberg-platform` — contract-first governed-runtime monorepo (developed primarily
    June 27 to 28, 2026).
  - `wolfberg-brain` — operating-method and context foundation.

Where we reuse the prior platform, it is referenced as a foundation/dependency and disclosed here.
It is not re-committed into this repository to appear newly written.

> Eligibility of disclosed prior work is being confirmed with the event organizers. This disclosure
> stands regardless of that ruling.

### In-window build log

- **2026-06-29** — Repository created; disclosure scaffolding.
- **2026-06-29** — 3D C-UAS operator interface built: simulation engine (CPA / IMM-style
  prediction), TypeScript port of the deterministic ROE/WCS gate, 3D battlespace (FOB, layered
  defense rings, sensor dome, live tracks with trails + predicted paths), operator rail (priority
  track list, WCS control, threat assessment + engagement decision, live FP metrics, hash-chained
  ledger). React + Vite + three.js / react-three-fiber. Typechecks and builds clean.

## Team

Wolfberg / Per Aspera. (See submission for the full team.)

## License

TBD, pending the event's open-source requirement.
