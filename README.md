# wolfberg-peraspera-hackathon

Wolfberg / Per Aspera entry for the **AWS Global Government Hackathon** (AWS Summit DC, June 29 to July 1, 2026).

## What this is

**Aegis-Edge** — a realistic 3D counter-UAS (counter-drone) simulation driven by an *explainable,
deterministic* threat-call AI. A 1 km² protected site ("Joint Base Cascade — North Gate") at dusk:
a procedural city, RADAR / RF / EO-IR sensor coverage that sweeps live, and four drones flying
real waypoint paths. Every track is scored by an LLM-free classifier (`src/model/threatCall.ts`)
and colored by threat. Click a drone for the plain-language "why"; a HIGH track surfaces a
**recommend-only DEFEAT held behind a 2-person human gate** — the LLM narrates but is never on the
kill-chain. Built with three.js + Vite; Bedrock (Nova) only narrates and falls back to an offline
template with no creds.

## Run it

```bash
npm install
npm run dev        # opens the Vite dev server; visit the printed http://localhost URL
```

Build / verify:

```bash
npm run typecheck  # tsc --noEmit
npm run build      # tsc + vite production build → dist/
npm run preview    # serve the production build
```

Optional live Bedrock narration (otherwise the offline template is used):

```powershell
. ..\..\.secrets\aws-workshop.ps1   # loads AWS creds (Nova works; Claude is gated)
```

### Controls

- **Drag** to orbit · **scroll** to zoom · **click a track** for the AI threat-call panel.
- Camera presets: **1** oblique · **2** top-down · **3** threat-axis · **4** sensor-eye · **F** follow the hostile.
- **D** (or the **▶ Demo** button) runs the scripted demo timeline; any manual gesture hands control back.

## Demo path (the scripted ▶ Demo timeline)

The **▶ Demo** button auto-plays the mission narrative — camera, threat-call panel and caption move
together so the story lands without manual driving (it stops the moment an operator touches a control):

1. **Coverage** — oblique establishing shot, then top-down to show RADAR/RF/EO-IR sweeping the no-fly volume.
2. **Classify** — back to oblique; the edge classifier has scored all four inbound tracks (deterministic, LLM-free).
3. **Friendly rejected** — select **0192** (fast, high, friendly transponder) → **NONE**, correctly not promoted.
4. **Bird rejected** — select **0205** (slow, tiny RCS, no C2 emitter) → **bird**, held off the threat list.
5. **Hostile** — select **0427** (quad thermal + commercial-UAS C2, inside the no-fly) → **HIGH**; cut to threat-axis.
6. **Ingress** — follow-hostile chase cam as 0427 penetrates the protected-asset core.
7. **Human gate** — reopen 0427: **RECOMMEND DEFEAT — requires 2-person auth**; LLM stays off the kill-chain.
8. **Close** — return to oblique: *explainable, human-governed counter-UAS, decided at the edge.*

> Recorded fallback (a screen capture of this path) is a manual pre-demo capture step — see the
> Discovered backlog in `.kiro/specs/aegis-edge/tasks.md`.

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

## Team

Wolfberg / Per Aspera. (See submission for the full team.)

## License

TBD, pending the event's open-source requirement.
