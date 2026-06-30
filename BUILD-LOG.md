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
- 2026-06-30 02:0x CDT — T9 done (Chopper). The "flashy" post-processing pass: wired an
  EffectComposer pipeline (RenderPass → UnrealBloomPass → vignette ShaderPass → OutputPass).
  Bloom (strength 0.65, radius 0.4, threshold 0.82) glows the brightest emissive bits — nav lights,
  tail strobes, HIGH threat rings — without washing out the dusk city windows. Added a mild radial
  vignette (custom shader) to draw the eye to the protected-asset core. OutputPass preserves the
  exact sRGB conversion the direct renderer.render() did, so base colors are unchanged — only glow
  is added. Resize now also drives composer.setSize. Verified: `npm run typecheck` + `npm run build`
  green.
- 2026-06-30 02:3x CDT — T10 done (Chopper). Scripted demo timeline + README run-steps/narrative
  (the R4.3 demo path). Added a ▶ Demo button (and `D` key) that auto-plays a 9-beat timeline:
  oblique establish → top-down coverage → oblique classify → select 0192 (NONE) → select 0205
  (bird) → select 0427 + threat-axis (HIGH) → follow-hostile ingress → reopen 0427 human-gate →
  oblique close. Each beat drives goView/setFollow/selectTrack and a centered caption banner
  (#demoCaption); beats fire by elapsed time in the render loop, reset to oblique at the end. Any
  manual gesture — cam button, key 1-4/F, or pointer-down on the canvas to orbit, or clicking a
  track — calls stopDemo() so the operator takes over instantly. Refactored track selection into a
  shared selectTrack() and follow into setFollow() so the click handler, keys and demo drive
  identically. README now has What-this-is, Run-it (+ optional Bedrock creds), Controls, and the
  Demo-path narrative; recorded fallback flagged as a manual capture step (D26). Classifier/threat
  -call untouched — the demo only orchestrates camera + existing panels. Self-extended tasks.md with
  D26 (clean recording mode), D27 (demo progress ticker), D28 (per-beat caption cut). Verified:
  `npm run typecheck` + `npm run build` both green.
- 2026-06-30 02:5x CDT — D1 done (Chopper). Altitude drop-lines + ground reticles (R1.6 depth
  cue). Each drone now drops a faint threat-colored vertical line from its hull straight down to a
  small flat ring reticle on the ground (RingGeometry 2.2–3.4, opacity ~0.5), so altitude and
  ground range read instantly in the oblique command view instead of being ambiguous against the
  city. Built once per track (BufferGeometry with a 6-float position attr for the line + a reticle
  mesh, both tinted by THREAT_COLOR like the trail/label); refreshed each frame in the render loop
  from the live drone position — top = (p.x, p.y, p.z), bottom + reticle = (p.x, 1.2, p.z). Cheap
  (2 verts + 1 ring per drone, no per-frame allocation), frustumCulled off so the line never pops.
  Classifier/threat-call untouched. Self-extended tasks.md with D29–D31 (see Discovered). Verified:
  `npm run typecheck` + `npm run build` both green.
- 2026-06-30 03:0x CDT — D2 done (Chopper). Answer-key lock: new `src/model/threatCall.test.ts`
  imports the real `classify` + scenario `tracks()` and asserts the published key — 0427 & 0318 →
  HIGH-threat drone, 0192 (friendly transponder) & 0205 (bird) NEVER promoted (threat NONE), and
  exactly the two hostiles reach a non-NONE threat. Wired into existing `npm test` (node --test +
  tsx). Build needed Node types for `node:test`/`node:assert`: added `@types/node` devDep and put
  `"node"` in tsconfig `types` (kept `"three"`; DOM globals unaffected). Verified: `npm test` 5/5
  pass, `npm run typecheck` + `npm run build` both green. R2.4 locked.
- 2026-06-30 03:2x CDT — D3 done (Chopper). Dusk scale-anchors so the city reads with human scale at
  dusk. Added two cheap deterministic `THREE.Points` clouds drawn with a soft radial glow sprite
  (warm white→amber→transparent canvas texture) and AdditiveBlending so the T9 bloom pass makes them
  glow: (1) a sparse street-light field — up to 150 warm points scattered across the ground via a
  position-seeded LCG, skipping building footprints (`cityBoxes`) and the protected-asset plaza; and
  (2) a 28-point perimeter ring of brighter warm lights at `protectedAsset.r + 12` round the plaza.
  No per-frame cost (static geometry, sizeAttenuation handles distance). Classifier untouched.
  Verified: `npm run typecheck` + `npm run build` both green. R1.1 dusk read landed.
- 2026-06-30 03:5x CDT — D4 done (Chopper). Starfield to finish the dusk atmosphere. A seeded
  Points cloud (~700 stars) placed on the upper dome only: uniform sphere directions kept where
  normalized y ≥ 0.34, i.e. above the warm horizon band where the sky shader has gone deep blue, so
  stars never sit over the city or wash out threat markers. Placed at r≈3300 (just inside the 3400
  sky sphere) with `fog:false` so the fog far plane (2600) doesn't erase them; size 7 px,
  sizeAttenuation off, opacity 0.55, depthWrite off, renderOrder −1 so it draws with the backdrop
  behind everything and stays under the bloom threshold. Position-seeded → identical every run; no
  per-frame cost. Classifier untouched. Verified: `npm run typecheck` + `npm run build` both green
  (dist 568.44 kB). R1.1 / R1.6 dusk sky completed.
- 2026-06-30 04:0x CDT — D5 done (Chopper). Living windows: ~40% of buildings now "live" — their
  window emissiveMap intensity breathes on a slow, per-building deterministic phase (two incommensurate
  sines so brightness dips irregularly, reading as windows flicking on/off), kept subtle (~0.65–0.88)
  so it never crosses the bloom threshold. One material write per living building per frame; the rest
  of the skyline stays static. Verified: `npm run typecheck` + `npm run build` green.
- 2026-06-30 04:31 CDT — D6 done (Chopper). Per-truth flight character so the truth label reads in
  motion (classifier untouched). The bird (0205) now wanders — a deterministic lateral weave
  (perpendicular to heading, two incommensurate sines) plus a gentle altitude bob, and its rotors
  idle (~9 vs 42 rad/s) so it never looks like purposeful UAS ingress. Per-truth bank clamp: the
  friendly (0192, fast R/C) banks wider/shallower (±0.3), the bird barely rolls (±0.18), hostiles
  stay tight (±0.6). Seeded a deterministic per-track `phase` from the id digits so motion is
  identical every run. Verified: `npm run typecheck` + `npm run build` both green.

## 2026-06-30 04:5x CDT — D7: ingress urgency cue
- Each frame, per track, compute horizontal range to the protected asset (`Math.hypot(p.x, p.z)`,
  asset at origin). A track is in "ingress" when it is HIGH **and** inside `SITE.noFlyR` (250).
- On ingress: tail-strobe blink frequency jumps 8→20 Hz and the track's trail opacity rises
  0.35→0.85, so a HIGH penetration of the no-fly volume reads as urgent in the live command view
  (R1.4 HIGH unmistakable, R4.3 ingress beat). Deterministic, ~3 ops/track, classifier untouched.
- Verified: `npm run typecheck` + `npm run build` both green.

## 2026-06-30 05:0x CDT — D8: sensor-fusion confidence cue
- Added `fusedMods: Set<string>` to each Live track. In the detection loop (which already decides
  per (sensor,track) whether a sensor "sees" the track from range + scan-lobe), record the sensor's
  modality into the track's set — so the set holds the distinct modalities currently fixing it.
- A track held by ≥2 distinct modalities is "FUSED": its tail-strobe off-floor lifts 0.12→0.6 (a
  steady glimmer instead of going dark between blinks) and its trail opacity bumps 0.35→0.55, so
  high-confidence multi-sensor tracks read at a glance (R1.3 sensor↔track association, R1.4).
- HUD clock line now appends `· N FUSED` alongside the track/HIGH counts.
- Set is cleared+recomputed each frame; strobe/trail brightening reads last frame's state (1-frame
  lag, imperceptible). Deterministic, cheap, classifier untouched.
- Verified: `npm run typecheck` + `npm run build` both green; `npm test` 5/5 pass.
- 2026-06-30 05:27 CDT — D9 done (Chopper). Sensor ID labels: each sensor post now floats a
  modality-tinted pill (RAD-1 blue / RF-1 violet / EO-1 teal) at y=26 above the post, reusing the
  track `makeLabel` canvas-sprite (hoisted) tinted by `MOD_COLOR[s.modality]`. Names the now-distinct
  coverage shapes (radar dome / RF wedge / EO frustum) at a glance (R1.3 readability). One sprite per
  sensor (3 total); depthTest off so they read over geometry. Classifier untouched.
- Verified: `npm run typecheck` + `npm run build` both green.
- 2026-06-30 05:53 CDT — D10 done (Chopper). Detection-line polish: live sensor→track detection
  lines now ease their opacity toward a target (DET_OP_MAX 0.45 when held, 0 when dropped) at
  ~dt*6/frame instead of a hard visible on/off pop, so a sweep "acquiring" a track fades in/out
  smoothly. Added `op` to DetLine; line stays visible + geometry-anchored to the live track while
  op>0.01 so the fade-out trails the drone. D8 fusion still counts only on actual `seen`. Cheap;
  classifier untouched.
- Verified: `npm run typecheck` + `npm run build` both green.
- 2026-06-30 06:0x CDT — D11 done (Chopper). Threat legend in the HUD: a compact color key under the
  ledger line with HIGH/MED/LOW/NONE swatches (matching THREAT_COLOR), each followed by a live
  per-level track count updated every frame from `live`. Lets a viewer decode the threat coloring
  at a glance without clicking (R1.4/R2). One cheap per-frame tally + DOM write; classifier untouched;
  clock line now reuses the same tally. Verified: `npm run typecheck` + `npm run build` both green.
- 2026-06-30 06:2x CDT — D12 done (Chopper). Selected-track emphasis in 3D: one shared spinning
  reticle (two opposing cyan brackets, RingGeometry arcs laid flat, parent spun about Y) parks on the
  selected drone each frame and hides on deselect — visually distinct from the full red pulsing HIGH
  threat ring. Paired with a gentle scale-pulse of the selected track's label (baseScale stored on the
  sprite at creation so it restores cleanly on deselect). Reinforces the leader line (R2 readability).
  Deterministic + cheap (4 tracks); classifier untouched. Verified: `npm run typecheck` + `npm run build` both green.
- 2026-06-30 06:5x CDT — D13 done (Chopper). Label declutter by distance: each track label's
  SpriteMaterial.opacity now fades with camera distance (full at ≤700u, easing to ~0.22 by ≥2200u)
  so a busy oblique command view stays readable and the floating pills never wash out the threat
  markers behind them. The selected track is pinned to opacity 1 so the chosen pick is always legible
  regardless of range. One distanceTo + clamped lerp per track per frame — cheap; classifier
  untouched (R1.6, R2). Verified: `npm run typecheck` + `npm run build` both green.
- 2026-06-30 13:3x CDT — COOP build started (Chopper). New objective: cooperative two-unit demo (Marine Beachhead + Army Tank Column, Link-16 fusion, ROE who-shoots, comms Case1/2, operator modes). Spec + 14-item DoD + todolist at .kiro/specs/coop-defense/. Phase A DONE: src/coop/{types,coordination}.ts = deterministic core (unitSees/airPicture fusion, linkUp, commsAvailable ~70%, selectShooter ROE cheapest-in-range + shoot-and-shout, resolveEngagement weapon-auth + mode gate). 10 new tests (coordination.test.ts) cover DOD-3/5/7/8/9/10/12/14 — all 15 tests green, typecheck + build green. Loop armed (COOP-LOOP.md) to grind Phases B–F until all DoD items pass.
- 2026-06-30 13:5x CDT — B1 done (Chopper). Cooperative scenario data + deterministic motion in
  `src/data/coopScenario.ts`: **Marine Beachhead** (id beachhead, stationary, BROAD radar 500m,
  SHORAD 400m + RF Zapper 250m, at origin) and **Army Tank Column** (id tank_column, mobile,
  LIMITED radar 200m, SLAMRAAM 600m + RF Zapper 250m). `columnPositionAt(tick)` closes the Column
  from x=900 toward the Beachhead at 9 m/s and clamps at x=200 standoff — same input → same output,
  no randomness; `tankColumnAt(tick)` returns the Column Unit at that tick. `LINK_RANGE_M=600`
  chosen so the Column starts OUT of link range and drives INTO it (the whole reason to share
  tracks — its small radar). Same site-local meters frame as scenario.ts; pure data, no three.js.
  4 new tests (`src/data/coopScenario.test.ts`): both units defined, Column starts >link-range &
  closes inside it, monotonic-decreasing x then halt+clamp at standoff, radar limited vs Beachhead,
  tankColumnAt mirrors columnPositionAt. DoD: DOD-1 data+motion (Column-moves-toward-Beachhead)
  satisfied & tested — render half deferred to B2, so DOD-1 box stays unchecked until B2; DOD-2
  radar-limited fact asserted here but its *visible* coverage is B2. Verified: `npm run typecheck`
  clean, `npm test` 19/19 pass (4 new), `npm run build` green (dist 570.53 kB). Single-site demo
  untouched. Next: B2 render both units + distinct sensor-coverage volumes.
- 2026-06-30 14:1x CDT — B2 done (Chopper). Rendered BOTH cooperating units in the 3D scene with
  distinct sensor-coverage volumes. New deterministic helper `src/coop/coverage.ts`: `unitCoverages()`
  decides each unit's dome radii from its sensor ranges and classifies radar broad-vs-limited
  RELATIVE across the unit set (smallest-radar unit = "limited") — pure, no three.js, so "Column
  radar visibly limited" is test-backed not eyeballed. 3 new tests (`src/coop/coverage.test.ts`):
  Beachhead→broad / Column→limited with Column dome smaller, radii map straight from unit ranges,
  lone-unit baseline. `src/main.ts` (additive only — single-site sensors/drones untouched): each
  unit gets a hex command pad, a radar coverage dome sized from `coverage`, a ground edge-ring (the
  at-a-glance broad/limited extent), a narrower EO/IR ring, and a `NAME · RADAR BROAD|LIMITED`
  label. The mobile Tank Column rides `columnPositionAt(elapsed)` toward the Beachhead each frame,
  dome moving with it. DoD: **DOD-1** (both units render + Column moves toward Beachhead) and
  **DOD-2** (distinct coverage; Column radar visibly limited, dome 200m vs 500m) — both now checked.
  Verified: `npm run typecheck` clean, `npm test` 22/22 pass (3 new), `npm run build` green
  (dist 572.28 kB; pre-existing three.js chunk-size warning only). Next: B3 blue/red/green drones.
- 2026-06-30 14:2x CDT — B3+C1+C2 done (Chopper): the coop air picture, Link-16 and fusion.
  **Data/core (deterministic, tested)** `src/data/coopScenario.ts`: `COOP_TRACKS` — 2 red hostiles,
  1 blue friendly, 1 green neutral, positioned against the unit sensor geometry so HOSTILE-1 stays
  Beachhead-only (in its radar, beyond the Column's reach all run) and NEUTRAL-1 is Column-only at
  standoff-start (far east, in the Column's radar, beyond the Beachhead) — so the two pictures DIFFER
  out of range; plus `coopLinkUpAt(tick,comms)` reusing `linkUp`+`commsAvailable` over the tested
  Column motion (one shared source of truth for renderer + tests). **4 new tests** (`coopScenario.test.ts`):
  DOD-6 factions incl. ≥1 red; DOD-4 link down@t=0 / up@t=60; DOD-3 pictures differ out of range
  (Beachhead holds HOSTILE-1 & not NEUTRAL-1, Column the reverse); DOD-5 HOSTILE-1 single-unit →
  shared on link-up via `airPicture` union. **Render (additive)** `src/main.ts`: coop drones drawn
  blue/red/green by `faction` (reusing `makeDrone`/`makeLabel`, idle rotor+bob); a Link-16 line
  between the units that pulses green when up / dims when acquiring, with a HUD status (gap metres +
  ESTABLISHED/acquiring); per-(unit,track) picture lines from `airPicture()` — a line a unit holds
  ONLY via the link draws in the cyan fusion tint (the visible single-unit→shared moment); HUD
  air-picture readout `Beachhead N · Column M · K shared` that flashes on the fusion moment.
  `index.html`: #coop HUD block (link16 + airpic + faction legend) + CSS. **DoD checked: DOD-3,
  DOD-4, DOD-5** (B3/C1/C2 task boxes too). DOD-6 left UNCHECKED — coloring + red threats present &
  tested, but the box also needs a red to *drive an engagement* (Phase D). Verified: `npm run
  typecheck` clean, `npm test` 26/26 (4 new), `npm run build` green (dist 575.67 kB; pre-existing
  three.js chunk-size warning only). Single-site demo + its tests untouched; LLM off every decision.
  Next: Phase D (D1 event/negotiation log, D2 shoot-and-shout in scene, D3 click→rationale) → DOD-6/7/8/11.
