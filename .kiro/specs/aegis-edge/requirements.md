# Aegis-Edge — Requirements (in-window build, AWS Gov Hackathon)

Status: DRAFT v1. **The demo centerpiece:** a realistic 3D counter-UAS simulation that an operator
watches live, where an **explainable threat-call AI** classifies each drone and a human gates the
response. The 3D sim and the AI are ONE integrated thing — the model's output drives the scene; a
click on any track shows the plain-language "why".

## Mission (the council demanded a named owner — here it is)
- **Mission owner / end-user:** the Base Defense Operations Center (BDOC) battle captain and the
  Security Forces small-UAS (sUAS) defense cell at a CONUS installation ("Joint Base Cascade —
  North Gate"), responsible for force protection against drone incursions over a 1 km² area.
- **Problem (one sentence):** base defenders get a flood of raw radar/RF/EO tracks with no fast,
  trustworthy, *explainable* call on which drone is a real threat — and can't legally run modern
  AI on the mission data.
- **Transition:** AFWERX SBIR Phase II → Phase III OTA under the Joint C-sUAS Office (JCO)
  portfolio; runs in GovCloud IL5; Bedrock is FedRAMP High / DoD IL4-5 so the demoed stack can
  legally touch CUI. Self-assessment posture, not an ATO.

## Architecture (council-validated split)
Deterministic edge classifier **on** the decision path (LLM-free, <1 ms, reproduces the answer
key). Amazon Bedrock **off** it, only to narrate the classifier's logged contributions. Defeat is
recommend-only, human-gated. Works disconnected; reconciles explanations on reconnect.

## Requirements

### R1 — Realistic 3D simulation (the wow factor)
- R1.1 Render the 1 km² site: terrain, a believable city of buildings, the protected asset, and
  the no-fly volume — readable at a glance, dusk lighting, shadows.
- R1.2 Drones fly **realistic paths** (smooth waypoint/spline navigation, banking toward heading,
  spinning rotors, motion trails), not straight lines. Multiple simultaneous tracks.
- R1.3 Sensor sites render with their coverage volumes (radar dome, RF wedge, EO/IR frustum).
- R1.4 Each track is colored by its AI threat level; HIGH threats are unmistakable.
- R1.5 Smooth camera (orbit/zoom), an oblique command default, and built-in views (top-down,
  threat-axis, sensor-eye). Target 60 fps on a laptop.
- R1.6 "Make it really realistic": progressively raise fidelity — better drone models, rotor
  blur, navigation/avoidance around buildings, sky/atmosphere, bloom/post-processing, labels.

### R2 — Explainable threat-call integration
- R2.1 Every track is classified by `model/threatCall` (deterministic, LLM-free).
- R2.2 Clicking a track opens a panel: class, threat, score, the contributions, and a plain-
  language justification; HIGH shows a recommend-only, human-gated defeat prompt.
- R2.3 The justification uses Bedrock when AWS creds are present (Claude→Nova), else the
  deterministic offline template; it never changes the classification.
- R2.4 Reproduce the answer key: track 0427 = HIGH-threat drone; the friendly (0192) and bird
  (0205) are NOT promoted to threat.

### R3 — Governance / audit
- R3.1 Consequential actions are recommend-only and pass a visible human gate.
- R3.2 Each call appends a hash-chained ledger entry (classification + contributions +
  explanation + flags); a timeline can replay the run.

### R4 — Platform / demo-readiness
- R4.1 Vite + TypeScript + three.js, vendored same-origin (no CDN/wasm/DRACO) — CSP-safe.
- R4.2 `npm run build` and `npm run typecheck` stay green every iteration.
- R4.3 A scripted demo path: load → watch the hostile ingress → it turns red → click → read the
  AI's reasoning → human-gate the defeat. Keep a recorded fallback.

## Out of scope / disclosed
Prior IP (wolfberg-platform/brain) referenced as foundation, not re-committed (see README).
