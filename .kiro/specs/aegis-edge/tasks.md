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
- [ ] T5. Threat overlays: per-track label (id/class/threat), a pulsing red ring under HIGH
      tracks, and a leader line to the panel on selection.
- [ ] T6. Bedrock explanation wired into the panel: on click, call a tiny backend/CLI bridge that
      runs `model/threatCall` + Bedrock (Nova) for the narrative; fall back to the offline
      template when no creds. Never alter the classification. (R2.3)
- [ ] T7. Human-gate UX: HIGH track shows a "RECOMMEND DEFEAT — requires 2-person auth" gate with
      approve/deny that writes a ledger entry; LLM-off-kill-chain badge visible. (R3)

## Wave 3 — demo polish (R1.5, R4.3)
- [ ] T8. Camera views: oblique-default, top-down, threat-axis, sensor-eye; smooth transitions;
      a "follow the hostile" toggle.
- [ ] T9. Post-processing: bloom on threat markers + nav lights, mild SSAO/contact shadows, a
      vignette — the "flashy" pass. Keep 60 fps.
- [ ] T10. Scripted demo timeline + recorded fallback; README with run steps + the mission/
      transition narrative.

## Discovered (loop appends here)
<!-- Each iteration: after a task, find the biggest gap to requirements.md and append 1-3 small,
     verifiable tasks (e.g. unit test for classify answer-key, ledger replay timeline, more
     tracks/swarm, audio cue, minimap inset). Keep build + typecheck green. -->
- [ ] D1. Altitude drop-lines: a faint vertical line from each drone down to a small ground
      reticle, threat-colored, so altitude/depth reads instantly in the oblique command view
      (R1.6 depth cue). Update reticle x/z each frame from the drone position.
- [ ] D2. Answer-key unit test (`src/model/threatCall.test.ts`): assert 0427/0318 classify HIGH
      and 0192 (friendly) / 0205 (bird) are NOT promoted to threat — locks R2.4 so future realism
      passes can't silently break the classifier. Wire into existing `npm test`.
- [ ] D3. Dusk scale-anchors: perimeter lights ringing the protected-asset plaza + a sparse field
      of warm street-light points across the ground, so the city has human scale and the dusk read
      lands (R1.1). Position-seeded, instanced/Points for cheapness; keep 60 fps.
- [ ] D4. Starfield: a faint deterministic star Points cloud high in the sky dome (above the warm
      band) to finish the dusk atmosphere without washing out threat markers (R1.1, R1.6).
- [ ] D5. Living windows: cheap deterministic flicker so a small fraction of building windows
      toggle on/off over time (modulate emissiveIntensity on a slow phase per building), giving the
      skyline life without per-window cost. Keep build green and 60 fps (R1.6).
- [ ] D6. Per-truth flight character: make the truth label visually legible in motion. The bird
      (0205) wanders — add a small deterministic lateral + altitude bob offset (sin of t·phase) and
      idle/slow rotors; the friendly (0192, fast) banks wider (lower bank clamp); hostiles stay
      precise and tight. Drives R1.2 "realistic paths" without touching the classifier. Keep build
      green and 60 fps.
- [ ] D7. Ingress urgency cue: each frame compute a track's horizontal range to the protected
      asset; when a HIGH track crosses inside `SITE.noFlyR`, speed up its tail-strobe blink and
      raise its trail opacity so the penetration reads as urgent in the live demo (R1.4 HIGH
      unmistakable, R4.3 ingress beat). Deterministic + cheap; classifier untouched.
- [ ] D8. Sensor-fusion confidence cue: reuse T4's per-frame detection to count how many distinct
      modalities currently hold each track; when ≥2 sensors see it, mark the track "FUSED" (brighten
      its strobe / bump trail opacity) and surface a fused-track count in the HUD clock line. Ties
      the new sensor↔track association into at-a-glance readability (R1.3, R1.4). Deterministic +
      cheap; classifier untouched. Keep build green and 60 fps.
- [ ] D9. Sensor ID labels: a small color-coded canvas-sprite label (RAD-1 / RF-1 / EO-1, tinted by
      modality) floating above each sensor post so the now-distinct coverage shapes are named at a
      glance (R1.3 readability). One shared sprite material per sensor; keep it cheap and 60 fps.
- [ ] D10. Detection-line polish: instead of a hard on/off pop, fade each detection line's opacity
      in/out (and optionally taper toward the track) so a sweep "acquiring" a track reads smoothly
      rather than flickering — animate material.opacity toward a target each frame (R1.3 polish).
      Cheap; classifier untouched. Keep build green and 60 fps.
## Done when
Waves 1-3 + Discovered checked or blocked; `npm run typecheck` + `npm run build` green; the
scripted demo path works end-to-end. Local commits only (Wasi pushes in the morning).
