# Build log — Aegis-Edge 3D (overnight self-extending loop)

Newest at the bottom. One line per iteration: date/time, task, how verified.

- 2026-06-29 23:0x CDT — Seed built by Chopper. Vite + TS + three.js app that BUILDS and runs:
  terrain + procedural city + protected asset + no-fly dome, 3 sensor sites w/ coverage volumes,
  4 drones flying smooth spline paths with spinning rotors + trails, threat coloring from the
  deterministic `model/threatCall` classifier, click-a-track → explainable threat-call panel
  (offline template). Synthetic scenario incl. hostile track 0427. Verified: `npm run typecheck`
  + `npm run build` green. Spec (requirements + tasks T1–T10) + loop playbook in place. Loop armed.
- 2026-06-29 23:31 CDT — T1 done (Chopper). Replaced the flat box drone with a real quadrotor:
  capsule hull (forward axis), carbon X-frame arms + motor pods, blurred contra-rotors (blur disc +
  two thin blades), a nose-slung camera gimbal w/ lens, and nav lights (port red / starboard green /
  blinking white tail strobe). Added bank-into-turn — the airframe rolls into the signed heading
  change (eased, clamped ±0.6 rad) via an inner `frame` group, while the outer group yaws via lookAt.
  Per-drone rotor spin + strobe blink in the loop. Classifier untouched. Verified: `npm run typecheck`
  + `npm run build` both green (dist 522 kB).
- 2026-06-29 23:55 CDT — T2 done (Chopper). City & terrain pass so the scene reads as a real dusk
  skyline, not a void. Added a gradient sky dome (warm horizon → deep-blue zenith via a BackSide
  ShaderMaterial, fog-off so it stays visible past the fog far). Buildings rebuilt as groups with
  procedural dusk facades: a pool of 6 emissive window canvas-textures scattered warm/cool, cloned
  per building with repeat scaled to footprint/height, over 5 varied concrete facade tones. Each
  building now has a closed roof slab + parapet rim (no more open box tops) plus deterministic
  rooftop equipment — HVAC blocks / water tank / comms mast w/ red obstruction beacon. Ground gets a
  subtle procedural speckle texture (repeat 28×) instead of flat color; fog tint warmed to dusk.
  All variety is position-seeded so it's identical every run. Classifier untouched. Verified:
  `npm run typecheck` + `npm run build` both green (dist 525.63 kB).
- 2026-06-30 00:0x CDT — T3 done (Chopper). Navigation realism. Each drone now owns its
  CatmullRomCurve3, built once at spawn (was rebuilt twice/frame) and queried by arc length
  (`getPointAt`), so ground speed is a true, constant m/s along the spline instead of varying where
  waypoints bunched — the param increment is `speedMps·dt / curveLen`. Added speed easing: drones
  ease off the throttle through sharp turns (`speedScale = 1 − min(0.55, |turn|·9)` from the same
  signed heading-change used for bank) and run full speed on straights. Added building avoidance by
  altitude: precomputed footprint boxes (+10 m margin) + rooftop height; each frame a drone overflying
  a roof smoothly climbs to clear it (rooftop + 16 m standoff, eased) and eases back down after,
  so paths read as deconflicted flight rather than clipping through towers. Heading pitches with the
  climb (lookAt on the climb-offset point). Trail now traces the flown spline (arc-length-spaced 80
  pts) instead of raw waypoints. Removed the per-frame `pathPoint`/curve rebuild and the bogus
  `len=1400` constant. Classifier untouched. Verified: `npm run typecheck` + `npm run build` both
  green (dist 525.98 kB).
- 2026-06-30 00:30 CDT — T4 done (Chopper). Sensor coverage polish + live sensor↔track
  association. The three sensors now render distinct, modality-true coverage instead of three
  identical wireframe domes: RAD-1 keeps a faint full-range dome but adds a rotating ground sweep
  sector spinning a true 360° (0.9 rad/s); RF-1 is a DF bearing wedge (±0.34 rad) that oscillates
  its bearing over ±1.5 rad; EO-1 is a narrow EO/IR camera frustum (ConeGeometry, apex at the
  sensor, ~0.2 rad half-angle) that pans ±1.2 rad. Each sensor's animated element lives in a per-
  sensor yaw group driven each frame from `bearing` (radar spins, rf/eoir bounce via sweepDir).
  Added a detection-line pool — one Float32 2-pt THREE.Line per (sensor, track), colored by
  modality — toggled each frame: a sensor "sees" a track only when it's in range AND the track
  falls inside the modality's current scan lobe (acos of the dot between the track bearing and the
  beam direction `(cos b, −sin b)` ≤ halfAngle). So detection lines pop on as a beam crosses a
  drone, visibly showing which sensors hold each track right now — and coverage gaps read honestly
  when no beam is on a track. Classifier untouched (Bedrock still narrate-only). Verified:
  `npm run typecheck` + `npm run build` both green (dist 528.02 kB).
- 2026-06-30 00:55 CDT — T5 done (Chopper). Threat overlays for at-a-glance readability. Each
  track now carries a floating canvas-sprite label (`id · CLASS · THREAT`, e.g. `0427 · DRONE ·
  HIGH`) tinted by threat color, built once via `makeLabel` (rounded pill, depthTest-off,
  renderOrder 999) and repositioned 15 m above the drone each frame. HIGH tracks (0427, 0318) also
  get a pulsing ground ring (RingGeometry, threat-red) that tracks the drone's x/z and breathes via
  a sin(t·4) pulse on scale (1→1.7×) and opacity (0.2→0.7) so penetrators are unmistakable. On
  click, a dashed SVG leader line (fixed full-screen overlay, z-index 9, pointer-events none) plus
  a small ring at the track end connects the selected drone — projected to screen via
  `v.project(camera)` each frame, hidden when behind the camera (v.z≥1) — to the open threat-call
  panel's top-left, colored to match the track's threat. Click-empty clears selection and hides the
  overlay. Classifier untouched (Bedrock still narrate-only). Verified: `npm run typecheck` +
  `npm run build` both green (dist 538.81 kB).
- 2026-06-30 01:10 CDT — T6 done (Chopper). Bedrock (Nova) explanation wired into the threat-call
  panel via a tiny same-origin bridge — the AI narration is now real, not a placeholder. New
  dependency-free `bridge/bedrock.mjs` signs a Bedrock `InvokeModel` call to Nova Lite
  (`us.amazon.nova-lite-v1:0`, us-east-1) with hand-rolled SigV4 over `node:crypto` (no AWS SDK, so
  the repo stays CSP-safe). It builds a tight operator-facing prompt from the classifier's logged
  contributions and returns 2-3 sentences; reads creds from env, 8 s timeout, throws on any failure.
  New `vite.config.ts` registers a dev middleware `POST /api/narrate {features}` that RE-RUNS the
  real `classify` server-side (Bedrock stays OFF the kill chain), narrates via Nova when creds are
  present, and falls back to `explainTemplate` otherwise — returning the classification verbatim.
  New client `src/narrate.ts` posts features, and crucially distrusts the server's prose unless its
  re-classification matches the authoritative client-side call exactly (class/threat/score), so
  Bedrock can never alter the threat call. `main.ts` panel now shows the offline template instantly
  with a "⏳ AI narrating…" state, then swaps in the narration tagged "◆ Bedrock Nova" or "○ offline
  template"; a monotonic token prevents a slow reply from overwriting a newer selection. Smoke-tested
  against LIVE workshop Bedrock (acct 477680267682): fixed a SigV4 403 — the canonical URI must
  double-encode the model-id colon (`%3A`→`%253A`) while the wire path single-encodes — then Nova
  returned a correct grounded narration for track 0427. Verified: `npm run typecheck` +
  `npm run build` both green (dist 539.60 kB). Note: the bridge runs under `npm run dev`; `vite
  preview` (static dist) has no endpoint and the client falls back to the offline template — by
  design (works disconnected). Self-extended: D14 bridge-health HUD pill, D15 narration cache +
  re-narrate, D16 hash-chained ledger seed (toward T7/R3.2).
- 2026-06-30 01:3x CDT — T7 done (Chopper). Human-gate UX for consequential action (R3.1). HIGH
  tracks now render a "⚠ RECOMMEND DEFEAT — requires 2-person auth" gate in the threat panel: two
  operator arm-toggles (OPERATOR A/B), an AUTHORIZE DEFEAT button that stays disabled until BOTH are
  armed, and a DENY button. The decision latches onto the track (re-opening the panel shows the
  outcome, not the live gate) and each action writes one audit-ledger entry {ts, trackId, class,
  threat, score, decision, operators} to an in-memory ledger; a live "audit ledger · N entries"
  counter shows in the HUD (R3.2 seed). A "human-gated · LLM off kill-chain" badge is visible inside
  the gate. Defeat is recommend-only — the gate authorizes/denies the recommended effector action,
  never the classifier (untouched, off the LLM path). Verified: `npm run typecheck` + `npm run build`
  both green (dist 541.71 kB). Self-extended: D17 hash-chain the T7 ledger, D18 ledger replay
  timeline, D19 keyboard-driven demo gate.
- 2026-06-30 01:5x CDT — T8 done (Chopper). Camera views + follow-hostile. Four eased presets
  (easeInOutQuad, ~0.8s): Oblique (default), Top-down, Threat-axis (camera drops onto the
  asset→top-threat ingress axis, behind+above the hostile, looking at the protected asset), and
  Sensor-eye (from sensor[0] looking at the top threat). Added a "▶ Follow hostile" chase cam that
  trails the most-threatening live track (HIGH>MED>LOW>NONE, ties by score) along its heading.
  HUD button row + keyboard 1-4 / F. During transitions and follow the camera is driven directly
  (manual lookAt, no damping fight); when settled it hands control back to OrbitControls so the
  operator can orbit. classifier untouched. Verified: `npm run typecheck` + `npm run build` green.
