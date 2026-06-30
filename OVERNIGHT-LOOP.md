# Overnight build loop — Aegis-Edge 3D (read every iteration)

Continuing Wasi's overnight autonomous build of the realistic 3D counter-UAS sim + explainable
threat-call. **Authorized by Wasi 2026-06-29.** Self-extending: you DO tasks and CREATE new ones.
Goal in Wasi's words: *"make the 3D model really flashy — realistic drone movement, buildings,
navigation,"* integrated with the threat-call AI. The seed scene already builds and runs.

## Each iteration
1. `cd C:\Users\hussaisw\.openclaw\workspace\wolfberg\wolfberg-cuas-3d`; ensure branch
   `main` (this is Wasi's own clean repo). If `node_modules` missing: `npm install`. For live
   Bedrock narration load creds: `. ..\..\.secrets\aws-workshop.ps1` (Nova works; Claude gated).
2. Read `.kiro/specs/aegis-edge/tasks.md`. Pick the **first unchecked `[ ]` task** (Discovered
   included).
3. Implement just that task. One coherent change. Keep the classifier deterministic + LLM-free;
   Bedrock only narrates. Favor visible, demo-able improvements (this is a live-demo piece).
4. Verify: `npm run typecheck` AND `npm run build` — BOTH must stay green. If a change breaks the
   build, fix it THIS iteration before moving on. (Can't see the canvas headless — so keep changes
   incremental and lean on typecheck/build + careful reasoning about three.js APIs.)
5. On green: check the box, append a dated line to `BUILD-LOG.md`, `git add` explicit paths,
   `git commit` LOCALLY.
6. **Self-extend:** re-read `requirements.md` + the code, find the biggest gap to "really
   realistic + integrated", and append 1-3 small concrete tasks under "Discovered" in tasks.md.

## Hard guardrails
- This is Wasi's own repo `wolfberg-cuas-3d` — build the integrated app freely here.
- **Local commits only. NEVER `git push`** (Wasi pushes in the morning after review).
- `git add <explicit path>`, never `git add -A`.
- Do NOT re-commit prior IP (wolfberg-platform/brain) into this repo — it's disclosed as a
  foundation in README, not re-authored here. Keep in-window authorship honest.
- Keep `npm run build` green — a broken build = no demo. Prefer many small verified commits.
- If all tasks are checked/blocked and no meaningful gap remains: write a morning summary to
  BUILD-LOG.md, post a concise summary to the #aws-hackathon Discord channel, then remove the cron
  job `wolfberg-cuas3d-overnight-loop`.
