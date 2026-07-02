# Aegis-Edge — wolfberg-peraspera-hackathon

Wolfberg / Per Aspera entry for the **AWS Global Government Hackathon** (AWS Summit DC, June 29 – July 1, 2026).

## 🎥 Demo

<video src="https://github.com/wasihussain914/Aegis-Edge/raw/main/media/aegis-edge-demo.mp4" controls muted width="860"></video>

▶ **[Watch the demo](https://github.com/wasihussain914/Aegis-Edge/blob/main/media/aegis-edge-demo.mp4)** &nbsp;·&nbsp; 🌐 **[Live sim + deck](https://wasihussain914.github.io/Aegis-Edge/)** &nbsp;·&nbsp; 📊 **[Pitch deck](https://wasihussain914.github.io/Aegis-Edge/pitch.html)**

## What this is

**Aegis-Edge** — a governable, resilient, **cooperative** counter-UAS (counter-drone) system, decided
at the edge. The thesis: **machine-speed decisions, a human authorizes every kill, and the LLM is
deliberately kept off the kill chain** — it explains, it never fires.

The 3D sim is the presentation layer over a deterministic governed loop:

- **Single-site defense** — a 1 km² protected site with RADAR / RF / EO-IR coverage. Drones ingress
  from far as grey UNKNOWN blips; sensors acquire → classify (LLM-free classifier, `src/model/threatCall.ts`)
  → a HIGH track is defeated behind a **human gate**. Click any drone for the plain-language "why."
- **Cooperative two-unit engagement** — a Marine Beachhead + an Army Tank Column fuse their radars over
  **Link-16**; the deterministic ROE core picks the **cheapest in-range effector** and stands the other
  unit down (shoot-and-shout). `src/coop/`.
- **DDIL resilience** — Case 2 runs a legible denied/degraded/jammed cycle; an EW jammer or a downed
  radar **blinds the sensors** so drones drop to **TRACK LOST**, and the moment sensing returns the
  system **reacquires and defeats** them — while the deterministic gate keeps governing at the edge
  (no cloud). This is the demo's climax.
- **Explainability** — Amazon **Bedrock** (Nova/Claude) narrates the threat call *after* the gate
  decides; falls back to an offline template with no creds. Off the kill chain, always.

Built with three.js + Vite. **45 unit/integration tests + 5 federation tests, all green.**

## Run it

```bash
npm install
npm run dev        # Vite dev server; open the printed http://localhost URL
```

Build / verify:

```bash
npm run typecheck  # tsc --noEmit
npm run test       # 50 tests
npm run build      # tsc + vite production build → dist/
npm run bench      # measure the deterministic gate latency
```

Optional live Bedrock narration (otherwise the offline template is used):

```powershell
. ..\..\.secrets\aws-workshop.ps1   # loads AWS creds (Nova works; Claude is gated)
```

## Measured performance

The deterministic gate is **not** a marketing "<1 ms" — it is **measured at ~0.58 µs per full
per-tick decision** (resolves every hostile's shooter/weapon by ROE + the approval gate; ~0.29 µs
per track) over 200k iterations, off any network path. Reproduce with `npm run bench`. That is why
it scales under a saturating swarm: the cost is the tracker and the effectors, never the decision.

## Controls (for the live demo)

- **Drag** to orbit · **scroll** to zoom · **click a track** → the AI threat-call panel, then **💥 Destroy**.
- Camera: **1** oblique · **2** top · **3** threat-axis · **4** sensor-eye · **F** follow · **D** scripted demo.
- **MODE** Manual / Combined / Autonomous · **COMMS** Case 1 / Case 2 (DDIL).
- **R** — knock the Beachhead / site radar down (DDIL).
- **J** — enemy EW jammer (denies Link-16 + blinds the radars).
- **Space** — pause the evaluation (freeze the world; camera stays live).

## The 5 demo beats (see `DEMO-RUNBOOK.md` for the exact sequence)

1. Detect → classify → **human-gated defeat**.
2. **Cooperative** engagement — Link-16 fusion + ROE cheapest-effector + shoot-and-shout.
3. **Swarm saturation** → pre-authorized auto-defense at machine speed.
4. **DDIL — jam it** → radars blind, threats go TRACK LOST, edge keeps governing.
5. **Recover (the money shot)** → reacquire + auto-defeat on the instant sensing returns.

## Presentation & docs

- **[HOW-IT-WORKS.md](HOW-IT-WORKS.md)** — the governed decision loop (sensors → IMM tracker →
  deterministic classifier → ROE gate → human gate → effector → ledger), edge/cloud split, and a code map.
- **[DATASETS.md](DATASETS.md)** — the real sensor-modality datasets, how each is used, and the honesty framing.
- `public/pitch.html` — the pitch deck (arrow keys / **F** fullscreen).
- `public/aws-diagram.html` — the **official-AWS-style** reference architecture (Kinesis → Greengrass gate → Bedrock; grounded in the verified runtime).
- `public/architecture.html` — the layered edge/cloud + sponsors architecture view.
- `PITCH-SCRIPT.md` — the timed 10-minute presenter script, mapped to all 5 judging criteria.
- `JUDGE-QA.md` — anticipated judge questions + grounded answers + honesty guardrails.
- `COST-ANALYSIS.md` — big-picture cost analysis (per-site capex/opex, AWS MDC, unit economics).
- `COLLAB-BRIEF.md` — the JADC2 best-collaboration integration (`src/collab/`).
- `DEMO-RUNBOOK.md` — the exact keypress/click sequence for the demo.

## Best-collaboration integration (JADC2)

`src/collab/` federates Aegis-Edge (the C-UAS air-defense spoke) with a partner multi-domain C2
dashboard over a shared `jadc2-threat` / `jadc2-tasking` contract — humans in the loop and defence-in-
depth two-person authority across the seam. See `COLLAB-BRIEF.md`.

## Prior work vs built during the hackathon

This is a disclosure section, kept current through the event.

- **Built during the hackathon window (June 29 to July 1, 2026):** everything committed to this
  repository. The commit history reflects genuine in-window authorship.
- **Prior intellectual property this builds on (created before the event):**
  - `wolfberg-platform` — contract-first governed-runtime monorepo (developed primarily
    June 27 to 28, 2026): the real IMM tracker over Kaggle telemetry, the hash-chained Ed25519 ledger,
    the SAPIENT effector tasking, and the swarm/Bedrock pipeline.
  - `wolfberg-brain` — operating-method and context foundation.

Where we reuse the prior platform, it is referenced as a foundation/dependency and disclosed here.
It is not re-committed into this repository to appear newly written.

> Eligibility of disclosed prior work is being confirmed with the event organizers. This disclosure
> stands regardless of that ruling.

## Team

Wolfberg / Per Aspera — Syed "Wasi" Hussain. (See submission for the full team.)

## License

TBD, pending the event's open-source requirement.
