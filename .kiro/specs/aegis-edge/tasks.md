# Tasks — Aegis-Edge (self-extending backlog)

Source of truth for the overnight loop. Work top-down; `[x]` when verified; `[blocked: reason]`
if stuck. **The loop appends new tasks under "Discovered" as it learns.** Verify each with
`npm run typecheck` AND `npm run build` (both must stay green). The seed scene already builds.

## Wave 1 — realism of the sim (R1)
- [x] T1. Better drone model: a proper quadrotor (arms, body, camera gimbal, nav lights), rotor
      motion blur, and bank-into-turn so motion reads as real flight. Replace the box body.
- [x] T2. City & terrain pass: window-lit building materials at dusk, varied rooftops, subtle
      ground texture, and a soft atmospheric sky + horizon so it doesn't read as a void.
- [x] T3. Navigation realism: drones path-find around buildings (simple avoidance / altitude
      adjust), with smooth heading and speed easing along the spline.
- [x] T4. Sensor coverage polish: distinct radar dome / RF bearing wedge / EO-IR frustum with
      subtle scan animation; show which sensors currently "see" each track.

## Wave 2 — integration + readability (R2, R1.4)
- [x] T5. Threat overlays: per-track label (id/class/threat), a pulsing red ring under HIGH
      tracks, and a leader line to the panel on selection.
- [x] T6. Bedrock explanation wired into the panel: on click, call a tiny backend/CLI bridge that
      runs `model/threatCall` + Bedrock (Nova) for the narrative; fall back to the offline
      template when no creds. Never alter the classification. (R2.3)
- [x] T7. Human-gate UX: HIGH track shows a "RECOMMEND DEFEAT — requires 2-person auth" gate with
      approve/deny that writes a ledger entry; LLM-off-kill-chain badge visible. (R3)

## Wave 3 — demo polish (R1.5, R4.3)
- [x] T8. Camera views: oblique-default, top-down, threat-axis, sensor-eye; smooth transitions;
      a "follow the hostile" toggle.
- [x] T9. Post-processing: bloom on threat markers + nav lights, mild SSAO/contact shadows, a
      vignette — the "flashy" pass. Keep 60 fps.
- [x] T10. Scripted demo timeline + recorded fallback; README with run steps + the mission/
      transition narrative. (Built: ▶ Demo button + D key auto-play a 9-beat timeline that walks
      camera/selection/caption through coverage→classify→hostile ingress→human-gate→close, stopping
      on any manual gesture; README now has What-this-is, Run-it, Controls, and the Demo-path
      narrative. Recorded fallback = manual pre-demo capture, tracked as D26 below.)

## Discovered (loop appends here)
<!-- Each iteration: after a task, find the biggest gap to requirements.md and append 1-3 small,
     verifiable tasks (e.g. unit test for classify answer-key, ledger replay timeline, more
     tracks/swarm, audio cue, minimap inset). Keep build + typecheck green. -->
- [x] D1. Altitude drop-lines: a faint vertical line from each drone down to a small ground
      reticle, threat-colored, so altitude/depth reads instantly in the oblique command view
      (R1.6 depth cue). Update reticle x/z each frame from the drone position.
- [x] D2. Answer-key unit test (`src/model/threatCall.test.ts`): assert 0427/0318 classify HIGH
      and 0192 (friendly) / 0205 (bird) are NOT promoted to threat — locks R2.4 so future realism
      passes can't silently break the classifier. Wire into existing `npm test`.
- [x] D3. Dusk scale-anchors: perimeter lights ringing the protected-asset plaza + a sparse field
      of warm street-light points across the ground, so the city has human scale and the dusk read
      lands (R1.1). Position-seeded, instanced/Points for cheapness; keep 60 fps.
- [x] D4. Starfield: a faint deterministic star Points cloud high in the sky dome (above the warm
      band) to finish the dusk atmosphere without washing out threat markers (R1.1, R1.6).
- [x] D5. Living windows: cheap deterministic flicker so a small fraction of building windows
      toggle on/off over time (modulate emissiveIntensity on a slow phase per building), giving the
      skyline life without per-window cost. Keep build green and 60 fps (R1.6).
- [x] D6. Per-truth flight character: make the truth label visually legible in motion. The bird
      (0205) wanders — add a small deterministic lateral + altitude bob offset (sin of t·phase) and
      idle/slow rotors; the friendly (0192, fast) banks wider (lower bank clamp); hostiles stay
      precise and tight. Drives R1.2 "realistic paths" without touching the classifier. Keep build
      green and 60 fps.
- [x] D7. Ingress urgency cue: each frame compute a track's horizontal range to the protected
      asset; when a HIGH track crosses inside `SITE.noFlyR`, speed up its tail-strobe blink and
      raise its trail opacity so the penetration reads as urgent in the live demo (R1.4 HIGH
      unmistakable, R4.3 ingress beat). Deterministic + cheap; classifier untouched.
- [x] D8. Sensor-fusion confidence cue: reuse T4's per-frame detection to count how many distinct
      modalities currently hold each track; when ≥2 sensors see it, mark the track "FUSED" (brighten
      its strobe / bump trail opacity) and surface a fused-track count in the HUD clock line. Ties
      the new sensor↔track association into at-a-glance readability (R1.3, R1.4). Deterministic +
      cheap; classifier untouched. Keep build green and 60 fps.
- [x] D9. Sensor ID labels: a small color-coded canvas-sprite label (RAD-1 / RF-1 / EO-1, tinted by
      modality) floating above each sensor post so the now-distinct coverage shapes are named at a
      glance (R1.3 readability). One shared sprite material per sensor; keep it cheap and 60 fps.
- [x] D10. Detection-line polish: instead of a hard on/off pop, fade each detection line's opacity
      in/out (and optionally taper toward the track) so a sweep "acquiring" a track reads smoothly
      rather than flickering — animate material.opacity toward a target each frame (R1.3 polish).
      Cheap; classifier untouched. Keep build green and 60 fps.
- [ ] D11. Threat legend in the HUD: a compact color key (HIGH/MED/LOW/NONE swatches) with the live
      per-level track count, so a viewer can decode the threat coloring at a glance without clicking
      (R1.4 HIGH unmistakable, R2 readability). Update counts from `live` each frame; cheap DOM
      write into the existing #hud block. Classifier untouched.
- [ ] D12. Selected-track emphasis in 3D: when a track is selected, add a thin animated selection
      ring around its drone (distinct from the HIGH threat ring) and gently scale-pulse its label so
      the chosen track is obvious in the scene, reinforcing the leader line (R2 readability). Clear
      on deselect. Deterministic + cheap; keep build green and 60 fps.
- [ ] D13. Label declutter by distance: fade each track label's sprite opacity with camera distance
      (full near, dim far) so a busy command view stays readable and the overlays never wash out the
      threat markers (R1.6, R2). Compute per frame from camera↔drone distance; cheap; 60 fps.
- [ ] D14. Bridge health pill in the HUD: on load, probe `/api/narrate` once with a known track and
      show a small status chip in #hud — "Bedrock Nova ●" (green) when the bridge returns
      source=bedrock, "offline template ○" (amber) otherwise — so the demo operator knows at a glance
      whether live narration is wired before clicking a track (R2.3, R4.3). One fetch at startup;
      reuse `fetchNarration`'s plumbing; classifier untouched.
- [ ] D15. Narration cache + re-narrate control: memoize the last narration per trackId so re-clicking
      a track is instant, and add a tiny "↻ re-narrate" affordance in the panel that forces a fresh
      Bedrock call (bypassing the cache) for the live demo. Keep the offline fallback path. Cheap DOM;
      classifier untouched (R2.3).
- [ ] D16. Ledger entry on each threat-call (R3.2 seed): when a track is classified/narrated, append a
      hash-chained entry {ts, trackId, class, threat, score, contributions, source, prevHash, hash} to
      an in-memory ledger and expose a count in the HUD. Pure client + deterministic SHA over the
      entry; sets up the T7 human-gate + replay timeline. Classifier untouched; keep build green.
      NOTE: T7 (done) already added the in-memory `ledger[]` + HUD counter and writes gate entries —
      so D16 now means: extend the *existing* T7 ledger with prevHash/hash chaining (cover classify +
      gate actions), don't build a second ledger.
- [ ] D17. Ledger replay timeline (R3.2): a collapsible overlay (toggle in the HUD) that lists the
      T7 ledger entries in order — ts · track · class/threat · decision · operators — newest last, so
      the audit trail can be walked through during the demo. Read-only DOM over the existing `ledger[]`;
      refresh on each append. Cheap; classifier untouched; keep build + typecheck green.
- [ ] D18. 3D authorized-defeat cue: when a HIGH track has a latched DEFEAT-AUTHORIZED decision, change
      its in-scene marker (e.g. swap the pulsing threat ring for a locked double-ring / brighter tint
      and a small "DEFEAT AUTH" sprite) so the authorized state reads in the command view, not only in
      the panel (R1.4, R3.1). Clear cue for DENIED too. Deterministic + cheap; keep 60 fps and build green.
- [ ] D19. Ledger JSON export: a tiny HUD affordance ("⤓ export ledger") that serializes the T7
      `ledger[]` to a downloadable JSON blob for after-action review (R3.2). Pure client (Blob + object
      URL); no network; classifier untouched. Keep build + typecheck green.
- [ ] D20. Radar-scope minimap (PPI inset): a small fixed 2D canvas in a HUD corner drawn each frame —
      the protected asset at center, the no-fly ring, sensor range rings, and live track blips
      threat-colored (with a tiny heading tick), north-up, scaled to SITE.size. Gives the classic
      operator "scope" read at a glance alongside the 3D view (R1.3, R1.4). Cheap 2D canvas; classifier
      untouched; keep build + typecheck green and 60 fps.
- [ ] D21. Active-view HUD chip: a small label in #hud showing the current camera vantage
      (OBLIQUE / TOP-DOWN / THREAT-AXIS / SENSOR-EYE / ▶ FOLLOW), updated from goView()/follow toggle so
      the operator and demo viewers always know the vantage (R1.5 polish). Cheap DOM; keep build green.
- [ ] D22. Auto-cut ingress beat: when a HIGH track first crosses inside SITE.noFlyR, flash a brief
      "INCURSION — <id>" banner and, unless the operator picked a view in the last few seconds, snap the
      camera to the threat-axis preset on that track — the scripted R4.3 ingress beat made automatic.
      Deterministic + one-shot per track; classifier untouched; keep build + typecheck green and 60 fps.
- [ ] D23. FPS / frame-time HUD readout: now that the bloom+vignette composer runs every frame
      (R1.6), add a tiny smoothed FPS counter to #hud (EMA of 1/dt) so the operator/demo can confirm
      the "keep 60 fps" target after the flashy pass. Cheap DOM write each frame; classifier untouched.
- [ ] D24. Protected-asset rotating beacon: mount a slow-rotating warm/amber beacon (emissive cone or
      a thin rotating light bar) atop the protected asset so the now-active bloom gives the core a
      living glow and anchors the eye (R1.1 protected asset readable, R1.6 exploit the flashy pass).
      Deterministic rotation from clock.elapsedTime; keep 60 fps and build + typecheck green.
- [ ] D25. Bloom-aware HIGH pulse: gently oscillate the HIGH threat ring's emissive/opacity above the
      bloom threshold so HIGH tracks visibly throb in the glow (R1.4 unmistakable), reusing the new
      UnrealBloomPass — no new passes. Deterministic sin(t); cap so MED/LOW never cross the threshold.
      Cheap; classifier untouched; keep build + typecheck green and 60 fps.
- [ ] D26. Recording mode (clean capture for the R4.3 recorded fallback): a key/toggle ("R") that adds a
      body class hiding the HUD, hint and cam-bar chrome (keep only the demo caption banner) so the
      scripted ▶ Demo timeline can be screen-captured cleanly into the recorded-fallback video. Pure DOM
      class toggle; auto-enable during demo if desired; classifier untouched; keep build + typecheck green.
- [ ] D27. Demo progress ticker: a thin progress bar (or "beat N/9 · T-<remaining>s") under the caption
      banner showing position along DEMO_SCRIPT while ▶ Demo runs, so the operator knows where in the
      scripted path they are and how long remains (R4.3 readability). Update from demoClock/DEMO_END each
      frame while active; hide when idle. Cheap DOM; classifier untouched; keep build green.
- [ ] D28. Per-beat caption cut: give each new scripted caption a quick fade-out→fade-in (and a left accent
      bar tinted to the selected track's threat color on select-beats) so beat transitions read as
      deliberate cuts in the recorded demo rather than text swaps (R4.3 polish). Cheap CSS/DOM driven by
      fireBeat(); classifier untouched; keep build + typecheck green.
- [ ] D29. Drop-line altitude callout: float a tiny "ALT <m>" canvas-sprite at the reticle end of each new
      D1 drop-line, showing the live altitude (round p.y) so the depth cue becomes an actual number on the
      ground — turning the at-a-glance read into a quantified one for the command view (R1.6). Reuse the
      makeLabel sprite pattern but redraw cheaply (only when the rounded value changes); tint by threat.
      Classifier untouched; keep build + typecheck green and 60 fps.
- [ ] D30. Reticle range-pulse: scale-pulse each D1 ground reticle proportional to the drone's horizontal
      range to the protected asset (tighter/faster pulse as it closes inside SITE.noFlyR), so an inbound
      track's reticle visibly "tightens" as it penetrates — reinforcing ingress urgency on the ground plane
      alongside D7's tail strobe (R1.4, R4.3). Deterministic from position; cheap; classifier untouched.
- [ ] D31. Ground-shadow blob under each drone: a soft dark radial sprite/disc on the ground at the reticle
      point (separate from the threat reticle), faint and scaled slightly by altitude, to anchor each drone
      to the terrain and sell the 3D depth without the cost of real shadow maps for fast movers (R1.2, R1.6).
      Cheap additive/alpha disc updated each frame from drone x/z; keep 60 fps and build + typecheck green.
- [ ] D32. Determinism + non-mutation tests (extend `threatCall.test.ts`, builds on D2): assert `classify`
      is pure — calling it twice on the same features deep-equals (locks R2.1 "same input → same output")
      — and that `explainTemplate` never mutates the Classification it is handed (deep-equal before/after)
      and that a HIGH narrative actually names its positive-weight drivers. Defends the "Bedrock/explanation
      is OFF the kill chain, never alters the call" architecture claim (R2.3). Tests only; classifier
      untouched; keep `npm test` + typecheck + build green.
- [ ] D33. Gate-boundary guard test (extend `threatCall.test.ts`): pin the HIGH-threat logic by perturbing
      real features — assert that clearing `insideNoFly` on 0427 drops it from HIGH to MED (geometry gate),
      and that flipping `friendlyTransponder` true on 0427 suppresses it to NONE. Locks the exact threat
      boundary so a future realism pass that rewires feature plumbing can't silently move the answer-key
      line (R2.4, R3.1). Tests only; classifier untouched; keep build + typecheck green.
- [ ] D34. Dusk ground haze: a single large faint additive radial-gradient disc (reuse a soft sprite/canvas
      texture, depthWrite off) laid flat just above the terrain so the new D3 street/perimeter lights and
      the nav-light bloom have low atmosphere to glow into, deepening the dusk read without per-frame cost
      (R1.1, R1.6). Warm-to-transparent, centered on the asset; keep it under the bloom threshold so it
      doesn't wash markers. Static geometry; classifier untouched; keep build + typecheck green and 60 fps.
- [ ] D35. Disconnected-ops + reconcile cue (R3.2 reconcile-on-reconnect, "works disconnected" claim): a HUD
      "LINK: ONLINE/DEGRADED" toggle (button + key). While DEGRADED, `fetchNarration` is forced to the
      offline template and every track narrated offline is queued; the HUD shows "N explanations pending
      reconcile". Toggling back to ONLINE drains the queue (clears the chip; optionally re-narrates the open
      track) to demo the edge-then-reconcile architecture. Pure client; classifier untouched; build green.
- [ ] D36. EO/IR track spotlight: when the EO-1 sensor currently sees a track (reuse T4's per-frame
      detection), cast a faint warm SpotLight (or a cheap soft cone sprite) from the sensor onto that
      track's drone, panning with the gimbal — so the "camera is locked on" reads in the scene and ties the
      sensor↔track association to a visible cue beyond the detection line (R1.3, R1.4). One reused light;
      target the live track position each frame; cap intensity so bloom stays controlled. 60 fps; classifier
      untouched; keep build + typecheck green.
- [ ] D37. Celestial disc (visible sun/moon): the scene has a directional `sun` light at (-500,700,400)
      but no visible source. Add a soft emissive disc/sprite placed along that light's bearing, low over
      the horizon and inside the sky dome, tinted warm to match the dusk band — so the lighting has an
      anchor and the eye gets a horizon focal point (R1.1, R1.6). Reuse the glow-sprite pattern; keep it
      under/at the bloom threshold so it glows without blowing out. Static; classifier untouched; keep
      build + typecheck green and 60 fps.
- [ ] D38. Starfield twinkle: give the D4 stars subtle life by modulating the shared PointsMaterial
      opacity with a slow global sin(t) (one uniform write per frame, no per-star cost), oscillating
      gently within a low band (~0.4–0.65) so the sky feels alive without ever rising toward the bloom
      threshold or washing out markers (R1.6). Deterministic from clock.elapsedTime; classifier
      untouched; keep build + typecheck green and 60 fps.
- [ ] D39. Audio incursion cue: a short deterministic WebAudio alert (one-shot per track) the first time
      a HIGH track crosses inside SITE.noFlyR — a brief two-tone alarm via an OscillatorNode, gated behind
      a HUD mute toggle (default muted so the page never autoplays sound; operator un-mutes for the demo).
      Reuse the same per-frame range check D7/D22 compute. No audio asset; pure WebAudio. Ties the ingress
      beat to a sound cue (R1.4, R4.3). Classifier untouched; keep build + typecheck green.
- [ ] D40. No-fly dome breach shimmer: while any HIGH track is inside the no-fly volume, pulse the dome's
      emissive/opacity (deterministic sin(t)) so the protected volume itself visibly reacts to penetration
      — at rest it stays faint, on breach it throbs amber→red — making "the asset is under threat" read in
      the scene without text (R1.1, R1.4). Drive from the same per-frame inside-noFlyR test; cap below the
      bloom threshold so it glows, not blows out. Cheap; classifier untouched; keep build green and 60 fps.
- [ ] D41. Ambient threat border: a thin full-screen edge vignette (pure DOM/CSS overlay) that fades to a
      low red glow whenever ≥1 HIGH track is inside SITE.noFlyR and clears otherwise — a peripheral
      "condition red" ambient cue that reinforces urgency for the live demo without occluding the scene
      (R1.4 unmistakable, R4.3 ingress beat). Toggle a body/overlay class each frame from the live count;
      cheap; classifier untouched; keep build + typecheck green.
- [ ] D42. Friendly transit corridor (scenario realism, builds on D6): the friendly (0192,
      transponder, NONE) currently flies `ingressPath` straight over the protected asset — odd for a
      cooperative aircraft. Give it its own off-axis transit path in `scenario.ts` that skirts the
      no-fly volume (closest approach > SITE.noFlyR) so its benign intent reads in the scene and pairs
      with D6's wider banking. Scenario waypoints only — DO NOT touch the classifier or 0192's
      features (`insideNoFly:false` already), and keep the answer-key test (D2) green. Verify typecheck
      + build + `npm test`.
- [ ] D43. Bird descent/perch beat (builds on D6): give the bird (0205) a slow sinusoidal cruise-
      altitude drift (gentle climb/descend over its loop, on top of D6's bob) so it reads as an animal
      riding thermals rather than holding a fixed AGL like the UAS tracks — purely a deterministic add
      to its y in the per-truth block. Cheap; classifier untouched; keep 60 fps and build green.
- [ ] D44. No-fly dwell timer (builds on D7): the per-frame ingress test already knows when a HIGH
      track is inside `SITE.noFlyR` — accumulate per-track dwell seconds while inside (reset on exit)
      and surface the worst current incursion in the HUD ("INCURSION <id> · <Ns> in zone"), a real
      BDOC time-in-zone metric that quantifies D7's strobe/trail urgency and sharpens the R4.3 ingress
      beat. Drive from the same `ingress` flag + dt; cheap DOM write; classifier untouched; keep
      build + typecheck green and 60 fps.
- [ ] D45. Panel sensor-fusion readout (integrates D8 into R2.2): in the click-to-open threat panel,
      render small per-modality chips (RAD / RF / EO) that light up for the modalities currently in
      `selected.fusedMods`, plus a "FUSED" badge when ≥2 hold it — turning D8's at-a-glance HUD count
      into a per-track sensor-custody detail the operator reads on click (R1.3 sensor↔track, R2.2
      panel completeness). Refresh the chips each frame while the panel is open; reuse the existing
      `fusedMods` set; classifier untouched; keep build + typecheck green and 60 fps.
- [ ] D46. Lost-custody track aging (builds on D8): track per-frame whether ANY sensor currently holds
      each track; when no modality has held it for >~2.5 s (custody lost), dim its label sprite and
      trail opacity and tag the label "· AGING" so a track that has slipped out of all coverage reads
      as degrading rather than confidently tracked (R1.3, R1.4 honesty of the picture). Reset on
      reacquire. Deterministic from `fusedMods.size` + dt; cheap; classifier untouched; keep build +
      typecheck green and 60 fps.
- [ ] D47. Active-sensor cue on the D9 labels (builds on D9 + T4 detection): each frame, count how many
      tracks a given sensor currently holds (reuse the per-(sensor,track) detection already computed for
      the live detection lines). When a sensor is actively detecting (≥1 track), brighten its post's
      emissive and lift its D9 label opacity toward full; when idle, settle both to a dim baseline — so a
      sweep "acquiring" something reads on the sensor itself, not just the beam line (R1.3 sensor↔track).
      Keep a handle to each sensor's post + label on the LiveSensor record. Deterministic + cheap;
      classifier untouched; keep build + typecheck green and 60 fps.
- [ ] D48. Sensor coverage legend (builds on D9): a compact 3-row color key in #hud — a swatch + name per
      modality (▮ RADAR · RAD-1 / ▮ RF · RF-1 / ▮ EO/IR · EO-1) tinted from MOD_COLOR — so a viewer can
      decode the now-named, color-coded coverage shapes and labels without hovering (R1.3 readability).
      Static DOM written once at startup into the existing #hud block; classifier untouched; keep build +
      typecheck green.
- [ ] D49. Ledger chain self-verify (builds on D16): once the T7/D16 ledger is prevHash/hash chained, add a
      `verifyLedger()` that re-walks the chain (recompute each entry's hash, check it links to prevHash) and
      surface the result in the HUD — "LEDGER ✓ <n> verified" (green) or "LEDGER ✗ broken @<i>" (red) — and
      flag it during ledger export (D19) too, so the audit trail is demonstrably tamper-evident rather than
      just appended (R3.2). Read-only over the existing `ledger[]`; deterministic SHA; classifier untouched;
      keep build + typecheck + `npm test` green.
- [ ] D50. Background airspace clutter (R1.2 "multiple simultaneous tracks", busier scope): add 2-3
      deterministic benign contacts that transit well outside `SITE.noFlyR` (commercial-ish transits,
      constant heading/altitude) as SCENE-ONLY decoration — small dim non-pulsing markers that read on the
      D20 minimap and in 3D so the airspace looks live, not staged with exactly four drones. Do NOT feed them
      to `model/threatCall` or the click/panel path and do NOT add them to the answer-key truth — they are
      visual density only, so the D2/D32/D33 classifier tests stay untouched and green. Cheap instanced/Points
      markers; keep build + typecheck green and 60 fps.

## Done when
Waves 1-3 + Discovered checked or blocked; `npm run typecheck` + `npm run build` green; the
scripted demo path works end-to-end. Local commits only (Wasi pushes in the morning).
