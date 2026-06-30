# Tasks — Aegis-Edge (self-extending backlog)

Source of truth for the overnight loop. Work top-down; `[x]` when verified; `[blocked: reason]`
if stuck. **The loop appends new tasks under "Discovered" as it learns.** Verify each with
`npm run typecheck` AND `npm run build` (both must stay green). The seed scene already builds.

## Wave 1 — realism of the sim (R1)
- [x] T1. Better drone model: a proper quadrotor (arms, body, camera gimbal, nav lights), rotor
      motion blur, and bank-into-turn so motion reads as real flight. Replace the box body.
- [ ] T2. City & terrain pass: window-lit building materials at dusk, varied rooftops, subtle
      ground texture, and a soft atmospheric sky + horizon so it doesn't read as a void.
- [ ] T3. Navigation realism: drones path-find around buildings (simple avoidance / altitude
      adjust), with smooth heading and speed easing along the spline.
- [ ] T4. Sensor coverage polish: distinct radar dome / RF bearing wedge / EO-IR frustum with
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
## Done when
Waves 1-3 + Discovered checked or blocked; `npm run typecheck` + `npm run build` green; the
scripted demo path works end-to-end. Local commits only (Wasi pushes in the morning).
