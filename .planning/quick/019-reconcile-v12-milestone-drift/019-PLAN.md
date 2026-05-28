# Quick Task 019 Plan

**Task:** Reconcile v1.2 milestone planning-state drift so complete-milestone can run truthfully

## Task 019-01

<files>
- .planning/ROADMAP.md
- .planning/REQUIREMENTS.md
- .planning/PROJECT.md
- .planning/STATE.md
- AGENTS.md
</files>

<action>
Update the active milestone docs so they describe what v1.2 actually shipped instead of what the original milestone draft still claimed. Remove stale references that keep v1.2 artificially open (for example Phase 15 ownership of timed dimming and milestone-wide verification, stale verify-work next-step text, and contradictory phase statuses/notes), but do not invent undelivered functionality. Treat the shipped v1.2 line as complete around the session/render/runtime surface that actually landed, and keep any remaining hardening as truthful follow-on or next-milestone work rather than pretending it was part of shipped v1.2.
</action>

<verify>
- `rg -n "Phase 15 still owns|verify-work 29|Status:\s*\[ \] Not started|Not yet planned — run `plan-phase 21`|timed dimming" .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/STATE.md .planning/PROJECT.md AGENTS.md`
- `rg -n "v1.2|Phase 29|milestone complete|ready for next milestone" .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/STATE.md .planning/PROJECT.md AGENTS.md`
</verify>

<done>
The milestone-facing planning docs no longer contradict the shipped history, and `complete-milestone` would not be blocked by obviously stale roadmap/requirements/state claims.
</done>

## Task 019-02

<files>
- .planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-05-PLAN.md
- .planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-05-SUMMARY.md
</files>

<action>
Close the one artifact-level blocker that still makes the readiness gate lie: Phase 23 has a committed gap-closure plan `23-05-PLAN.md` but no matching summary, even though later quick-task and ship history show the underlying drift was already resolved. Write a truthful summary that records what actually happened, explicitly ties the closure to the later fix path, and preserves that this was artifact reconciliation rather than a fresh code execution pass.
</action>

<verify>
- `test -f .planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-05-SUMMARY.md`
- `rg -n "23-05|artifact reconciliation|quick task 016|78817e7|render-contract drift" .planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-05-SUMMARY.md`
</verify>

<done>
Phase 23 no longer has an unmatched `23-05-PLAN.md`, and the artifact history explains truthfully why the closure summary was backfilled.
</done>

## Task 019-03

<files>
- .planning/quick/019-reconcile-v12-milestone-drift/019-PLAN.md
- .planning/quick/019-reconcile-v12-milestone-drift/019-SUMMARY.md
- .planning/quick/019-reconcile-v12-milestone-drift/019-VERIFICATION.md
- .planning/STATE.md
</files>

<action>
Run the same readiness-style checks that blocked `complete-milestone`, capture the reconciled result in a quick-task verification artifact, and update `STATE.md` so the next milestone-close attempt starts from the corrected truth. Keep this narrowly about planning-state reconciliation; do not archive the milestone or tag a release inside this quick task.
</action>

<verify>
- Re-run the phase plan/summary count check across `.planning/phases/*/`
- `git tag --list "v*" | sort -V | tail -5`
- `rg -n "Phase 15|23-05-PLAN.md|ready for `verify-work 29`|quick task 019" .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/STATE.md .planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-05-SUMMARY.md`
</verify>

<done>
Quick-task docs/state are written, verification records the corrected readiness picture, and the repo is ready to retry `complete-milestone` truthfully.
</done>
