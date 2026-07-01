# Demo Runbook — the exact sequence

Live sim at the printed `localhost` URL (or the tunnel). Default state on load: **Manual** mode,
**Case 1** comms, **Beachhead** perspective. Let the Tank Column drive in for ~20s before you start
narrating beat 2 — that's when Link-16 fuses.

> Pre-flight: click once anywhere first (unlocks audio). Have the deck (`public/pitch.html`) and the
> architecture diagram (`public/architecture.html`) open in other tabs. Keep a local `npm run dev`
> fallback running in case the tunnel drops.

## Beat 1 — Detect → classify → human-gated defeat  (~60s)
1. Oblique view (press **1**). Point out a grey **UNKNOWN** contact inbound from the edge.
2. As it crosses into sensor range it turns **red HOSTILE** (a sensor acquired + classified it).
3. **Click** the hostile → the AI threat-call panel opens. Read the plain-language "why."
4. Press **💥 DESTROY TARGET** → burst + boom, logged. *"Nothing fired until I authorized it."*

## Beat 2 — Cooperative engagement  (~75s)
1. Wait until the **convoy turns from amber to blue** and LINK-16 reads ✓ ESTABLISHED (~t20s).
   *"The two units just fused into one air picture."*
2. Point at the mission log: the system negotiated **who shoots** — cheapest in-range effector by ROE,
   the other unit **stands down** (shoot-and-shout).
3. Click a coop hostile → **Destroy** (or let Autonomous mode auto-fire — toggle **MODE → Autonomous**).

## Beat 3 — Swarm saturation  (~45s)
> If showing the 2D console: switch to it here. Otherwise narrate over the sim.
1. *"Past ~6 simultaneous threats no human can gate each one — so the operator pre-authorizes a
   bounded AUTO-DEFENSE envelope and the deterministic gate engages at machine speed, every action
   hash-chained."*

## Beat 4 — DDIL: jam it  (~60s)
1. Press **J** (enemy jammer) — or **COMMS → Case 2** and wait for the jam window.
2. The **red jamming sector** appears; the threats flip to grey **⚠ TRACK LOST**; the air-picture reads
   **"⚠ N THREATS UNTRACKED."** *"The enemy jams us — our radars go blind, we can't see or shoot."*
3. Point at the green banner: **COMMS DENIED → EDGE-AUTONOMOUS.** *"The gate keeps deciding locally —
   no cloud — it just has nothing to shoot until sensing returns."*

## Beat 5 — Recover (the money shot)  (~45s)
1. Press **J** again (or release **R** / let the jam window end).
2. Threats **REACQUIRE** (turn red), and ~1s later the system **auto-defeats** them — bursts + booms.
   *"The instant sensing comes back, the system reacquires the threats it couldn't touch and finishes
   the job. Jamming didn't beat us — it delayed us."*
3. Land it: *"Blind us, and the edge holds the line and finishes the job the moment it can see again."*

## Handy keys
- **1/2/3/4** camera · **F** follow · **Space** pause (freeze the world, camera stays live) · **D** scripted demo.
- **R** radar down · **J** jammer · **MODE** Manual/Combined/Autonomous · **COMMS** Case 1 / Case 2.
- Click any threat → **💥 Destroy**. (Friendlies/birds have no Destroy button — the discrimination holds.)

## If something breaks
- Tunnel dead → use the local `npm run dev` tab.
- Audio silent → click the canvas once (browser gesture unlock).
- Want a clean slate → refresh the page (deterministic; same scenario every load).
