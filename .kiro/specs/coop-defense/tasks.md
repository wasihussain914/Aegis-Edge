# Todolist — Coop-Defense (the loop updates this until every DoD item passes)

Verify each task with `npm run typecheck` + `npm test` + `npm run build` (all green). The
deterministic core is test-covered; UI/3D tasks are verified by build + careful reasoning + any
added smoke tests. Keep the dusk/command-center aesthetic. Map every task to its DoD item(s).

## Phase A — deterministic core (DONE, test-covered)
- [x] A1. `src/coop/types.ts` — units, weapons (cost order), modes, comms, engagement types.
- [x] A2. `src/coop/coordination.ts` — `unitSees`, `airPicture` (fusion), `linkUp`, `commsAvailable`
      (Case2 ~70%), `selectShooter` (ROE cheapest in-range + shoot-and-shout), `resolveEngagement`
      (weapon auth + operator-mode gate). Pure, no three.js.
- [x] A3. `src/coop/coordination.test.ts` — 10 tests covering DOD-3/5/7/8/9/10/12/14 logic. GREEN.

## Phase B — two units in the 3D scene
- [x] B1. Scenario: define **Marine Beachhead** (stationary, broad radar, SHORAD+RF) and **Army
      Tank Column** (mobile, LIMITED radar, SLAMRAAM+RF) in `src/data/coopScenario.ts`; the Column
      moves toward the Beachhead over time. (DOD-1 — data+motion done & tested; render is B2)
- [x] B2. Render both units in 3D with **distinct sensor-coverage volumes**; the Tank Column's
      radar dome is visibly smaller than the Beachhead's. (DOD-1, DOD-2)
- [ ] B3. Drones render **blue (friendly) / red (hostile) / green (neutral)** from `faction`;
      ≥1 red threat present. (DOD-6)

## Phase C — link + fusion, visible
- [ ] C1. Drive link state from `linkUp()`; render a **Link-16 line + status indicator** that
      establishes as the Column closes into range. (DOD-4)
- [ ] C2. Per-unit air picture from `airPicture()`: ≥1 track visible to ONE unit before link-up,
      to BOTH after; show the fusion moment. (DOD-3, DOD-5)

## Phase D — engagement, negotiation, explanation
- [ ] D1. Each tick run `selectShooter`/`resolveEngagement` on hostiles; a running **event /
      negotiation log** (detections, link up/down, who-shoots, shoot-and-shout, approvals). (DOD-7)
- [ ] D2. **Shoot-and-shout**: on fire, broadcast + add to `engaged`; the other unit stands down
      on that track (already enforced by `selectShooter`). Show it in scene + log. (DOD-8)
- [ ] D3. Click a drone → panel shows **classification rationale AND engagement rationale**
      ("who shoots + why this weapon"), plain English (template now, Bedrock when creds). (DOD-11)

## Phase E — operator controls
- [ ] E1. Operator-mode switch **Manual / Combined / Autonomous** wired to `resolveEngagement`;
      the approval gate changes live; RF Zapper engagements require a human. (DOD-9, DOD-10, DOD-14)
- [ ] E2. Comms toggle **Case 1 ↔ Case 2**; Case 2 drops the link intermittently → **stale/aging
      tracks, delayed-or-failed handoff, fallback to self-protect**, with plain-English callouts. (DOD-12)
- [ ] E3. **Perspective switch** Beachhead ↔ Tank Column air picture. (DOD-13)
- [ ] E4. Every required human-approval point **pauses on a gate**; nothing fires past it. (DOD-14)

## Phase F — verify the whole checklist
- [ ] F1. Add a coop scene/integration smoke test where feasible; walk all 14 DoD items; record
      pass/fail for each in BUILD-LOG. Flag any assumption made.

## DEFINITION OF DONE (the loop checks these off; STOP when all are ✓)
- [x] DOD-1 both units render; Column moves toward Beachhead
- [x] DOD-2 distinct coverage; Column radar visibly limited
- [ ] DOD-3 out-of-range air pictures differ
- [ ] DOD-4 Link-16 establishes w/ visual + status
- [ ] DOD-5 link-up fuses; ≥1 single-unit track becomes shared
- [ ] DOD-6 blue/red/green drones; ≥1 red drives an engagement
- [ ] DOD-7 ROE+position negotiation resolves an engagement (in log)
- [ ] DOD-8 shoot-and-shout; other unit stands down
- [ ] DOD-9 RF needs human; SHORAD/SLAMRAAM human-or-machine per mode
- [ ] DOD-10 Manual/Combined/Autonomous change the approver, live
- [ ] DOD-11 click → classification + engagement rationale, plain English
- [ ] DOD-12 Case1↔Case2; Case2 shows stale/delayed/failed/fallback w/ callouts
- [ ] DOD-13 perspective switch Beachhead ↔ Column
- [ ] DOD-14 every human-approval point pauses on a gate; nothing auto-fires past
