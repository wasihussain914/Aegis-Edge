# Coop-Defense — Requirements (cooperative two-unit extension)

Extend the single-site Aegis-Edge demo to **two cooperating units** sharing a tactical data
link (Link-16 / TADIL-J) and negotiating engagements, including graceful degradation when the
link drops. Preserve the architecture: **deterministic core decides; the LLM only explains;
works offline with templated fallback.** Keep the dusk/command-center aesthetic.

## Units
- **Marine Beachhead** — stationary. Sensors: radar (broad) + EO/IR. Weapons: SHORAD + RF Zapper.
- **Army Tank Column** — moves toward the beachhead. Sensors: radar (LIMITED) + EO/IR. Weapons:
  SLAMRAAM + RF Zapper. The limited radar is the whole reason data-sharing matters — make the
  coverage gap visible.
- Drones classified **blue (friendly) / red (hostile) / green (neutral)**.

## Rules (deterministic core — must be unit-tested)
- **CONOPS:** self-protect first; protect the other when able; negotiate who takes each shot.
- **ROE weapon cost order (cheapest first):** RF Zapper → SLAMRAAM → SHORAD. Engage with the
  cheapest **available, in-range** effector across both units; tie-break by position.
- **Shoot-and-shout:** any shot is broadcast; the other unit stands down on that track.
- **Authorization by weapon:** SHORAD & SLAMRAAM may engage on human OR machine command; RF
  Zapper REQUIRES a human in the approval set.
- **Two-operator confirmation, selectable mode:** Manual = 2 humans; Combined = 1 human + 1 AI;
  Autonomous = 2 AI. Mode changes who must approve. (Consequence: in Autonomous, an RF-Zapper
  engagement cannot clear — no human present — and must fall back or hold.)
- **Comms cases:** Case 1 = persistent link. Case 2 = ~70% availability (intermittent dropouts).
  "All battle managers see all tracks" holds ONLY while the link is up.

## What the viewer can do
- Click a drone → panel with classification rationale ("why a threat") AND engagement rationale
  ("who shoots + why this weapon"), plain English.
- Switch perspective: Beachhead air picture ↔ Tank Column air picture.
- Toggle comms Case 1 ↔ Case 2 and watch behavior change (stale tracks, delayed/failed handoff,
  fallback to self-protect, with plain-English callouts).
- Switch operator mode (Manual / Combined / Autonomous) and see the approval gate change live.
- Read a running event/negotiation log (detections, link up/down, who-shoots, shoot-and-shout,
  approvals).
- Human-in-the-loop: every required human-approval point pauses on a gate; nothing fires past it.

## Definition of Done (the checklist — verify every item, iterate until all pass)
DOD-1  Stationary Beachhead + a Tank Column that visibly moves toward it both render in 3D.
DOD-2  Distinct sensor coverage; the Tank Column's radar is visibly more limited.
DOD-3  Out of range, the two units' air pictures differ (a track one sees, the other doesn't).
DOD-4  Link-16 establishes as the Column closes, with a clear visual + status indicator.
DOD-5  On link-up, tracks fuse; ≥1 previously single-unit track becomes visible to both.
DOD-6  Drones render blue/red/green; ≥1 red threat drives an engagement.
DOD-7  ≥1 engagement resolved by ROE + position negotiation (cheapest available weapon), in log.
DOD-8  Shoot-and-shout broadcast on fire; the other unit stands down on that track.
DOD-9  RF Zapper requires human approval; SHORAD/SLAMRAAM honor human-or-machine per mode.
DOD-10 Manual/Combined/Autonomous each change who must approve; switching reflected live.
DOD-11 Clicking a threat shows classification rationale AND engagement rationale in plain English.
DOD-12 Comms toggle Case 1 ↔ Case 2; under Case 2 link drops intermittently → stale tracks /
       delayed-or-failed handoff / fallback to self-protect, with plain-English callouts.
DOD-13 Perspective control switches Beachhead ↔ Tank Column views.
DOD-14 Every required human-approval point pauses on a gate; nothing auto-fires past it.

## Assumptions (flag as made)
- Reuse existing `classify` for blue/red/green (map class/threat → faction color).
- Link-16 establishes purely on range between the two units (no terrain LOS modeling).
- "Available weapon" = in-range + not already committed; magazines are unlimited for the demo.
