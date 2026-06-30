# Coop-Defense build loop — read every iteration

Continuing Wasi's agentic build of the **cooperative two-unit drone-defense demo** (Marine
Beachhead + Army Tank Column, Link-16 fusion, ROE who-shoots, comms degradation). **Authorized by
Wasi 2026-06-30.** Spec: `.kiro/specs/coop-defense/`. Run until the DEFINITION OF DONE in
`tasks.md` is all checked, then stop. Test-driven: keep the deterministic core covered by tests.

## Each iteration
1. `cd C:\Users\hussaisw\.openclaw\workspace\wolfberg\wolfberg-cuas-3d`; branch `main`; if
   `node_modules` missing run `npm install`. For live Bedrock load `. ..\..\.secrets\aws-workshop.ps1`.
2. Read `.kiro/specs/coop-defense/tasks.md`. Pick the **first unchecked `[ ]` task** (Phase A→F).
3. Implement just that one coherent change. **Architecture rules (preserve):** the deterministic
   core (`src/coop/`, `src/model/`) makes ALL decisions — classification, ROE, who-shoots, gate;
   the LLM/Bedrock layer ONLY writes plain-English explanations and must degrade to templates.
   Keep the dusk/command-center aesthetic. Reuse `classify` for blue/red/green.
4. **Verify: `npm run typecheck` AND `npm test` AND `npm run build` must ALL stay green.** For any
   new deterministic logic, ADD a test first (or alongside). If a change breaks a check, fix it
   this iteration before moving on.
5. On green: check the task box, check any DoD items it satisfies, append a dated line to
   `BUILD-LOG.md` (what + which DoD items + how verified), `git add` explicit paths, commit LOCALLY.
6. **Self-extend:** if a DoD item is only partially met, append a concrete follow-up task. Re-read
   `requirements.md` and verify against the 14 DoD items honestly.

## Hard guardrails
- Wasi's own repo — build freely in `src/`, `.kiro/specs/coop-defense/`. **Local commits only;
  do NOT `git push`** (Wasi/Chopper push on request). `git add <path>`, never `git add -A`.
- Don't break the existing single-site demo / its tests; the coop layer extends, not replaces.
- LLM stays OFF every decision; templated fallback must keep the core working offline.
- **STOP condition:** when ALL 14 DoD items in tasks.md are checked, write a final summary to
  BUILD-LOG.md, post a concise summary to the #aws-hackathon Discord channel, and remove the cron
  job `wolfberg-coop-loop`. Don't invent scope past the DoD.
