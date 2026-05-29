# Phase 4 Research

**Date:** 2026-05-29
**Phase:** 4 — Verification and Contract Cleanup
**Requirement:** `TRF-07`

## Scope Reminder

- [VERIFIED] Phase 4 is a cleanup-and-proof phase, not a redesign phase. Its goal is to lock milestone `v1.3` by updating active shipped tests, fixtures, examples, and current planning truth so they match the already-delivered Phases 1-3 contract.
- [VERIFIED] `04-CONTEXT.md` explicitly narrows cleanup to active shipped surfaces, includes the unmatched-angle-bracket invalid-markup formatter gap, limits fixture/example cleanup to active references and verification inputs, and limits planning cleanup to current-phase drift rather than archive gardening.

## Sources Consulted

- [VERIFIED] `.planning/ROADMAP.md`
- [VERIFIED] `.planning/REQUIREMENTS.md`
- [VERIFIED] `.planning/STATE.md`
- [VERIFIED] `.planning/phases/04-verification-and-contract-cleanup/04-CONTEXT.md`
- [VERIFIED] `.planning/phases/03-rich-date-time-formatting-surface/03-UAT.md`
- [VERIFIED] `.planning/phases/03-rich-date-time-formatting-surface/03-VERIFICATION.md`
- [VERIFIED] `packages/cli/src/builtin-addons/date-time/format.ts`
- [VERIFIED] `packages/cli/src/builtin-addons/date-time/index.test.ts`
- [VERIFIED] `config.yml`
- [VERIFIED] `README.md`
- [VERIFIED] `packages/cli/fixtures/phase-7/config.shared-dark.yml`
- [VERIFIED] `packages/cli/fixtures/phase-7/config.shared-light.yml`
- [VERIFIED] `.planning/solutions/workflow-issues/stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md`
- [VERIFIED] `.planning/solutions/test-failures/cwd-relative-fixture-tests-break-workspace-runs-2026-05-24.md`
- [CITED] Day.js format docs: `https://day.js.org/docs/en/display/format`

## Ground Truth

### Live Contract Already Shipped

- [VERIFIED] Shared `Text` owns text semantics: typography sizing, fit behavior, and strict-whitelist rich-markup rendering remain core-owned rather than theme-owned or widget-local.
- [VERIFIED] Built-in `date-time` now uses one `format` field and runs Day.js token expansion before the shared `Text` rich-render pass.
- [VERIFIED] `config.yml` already reflects the live single-field contract through `type: date-time` entries that use `format: 'HH:mm'`.
- [VERIFIED] `README.md` does not contain stale `date_format` / `time_format` split-field guidance.

### Active Runtime Gap Still Open

- [VERIFIED] `packages/cli/src/builtin-addons/date-time/format.ts` still treats an unmatched `<` without a later `>` as one literal `markup` segment and stops formatting the rest of the suffix.
- [VERIFIED] Because only `text` segments pass through `dayjs(date).format(...)`, malformed input like `Broken <accent HH:mm` currently renders as `Broken <accent HH:mm` instead of preserving the broken literal while still expanding `HH:mm`.
- [VERIFIED] `packages/cli/src/builtin-addons/date-time/index.test.ts` covers nested-invalid markup but does not cover unmatched-angle-bracket malformed markup.
- [CITED] Day.js format docs document token formatting and square-bracket escaping for literals; Sireno's `<...>` markup contract is a repo-owned layer on top, so Sireno must preserve expansion behavior explicitly when markup is malformed.

### Active Planning Truth Drift Still Open

- [VERIFIED] `.planning/phases/03-rich-date-time-formatting-surface/03-UAT.md` is already truthful after rerun: `status: complete`, `passed: 1`, `issues: 0`, and rerun result `pass (rerun after 03-03)`.
- [VERIFIED] `.planning/phases/03-rich-date-time-formatting-surface/03-VERIFICATION.md` is stale after that rerun and still says `verify-work 3 should now be rerun`, still reports manual UAT as `0 passed, 1 issue`, and still ends with `Next: rerun verify-work 3`.
- [VERIFIED] The solution record `stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md` says UAT, verification, `STATE.md`, and `AGENTS.md` should be treated as one consistency set after reruns because stale metadata can misroute later workflows.

### Fixture / Example Cleanup Scope Is Smaller Than It First Looked

- [VERIFIED] Repo-wide searches for `date_format|time_format|display_date|display_time` found no active runtime or README hits in current code paths.
- [VERIFIED] The only committed fixture files still using stale split date-time fields are:
  - `packages/cli/fixtures/phase-7/config.shared-dark.yml`
  - `packages/cli/fixtures/phase-7/config.shared-light.yml`
- [VERIFIED] Additional searches found no references to those Phase 7 fixture filenames or labels anywhere else in the repo, which strongly suggests they are historical phase artifacts rather than active shipped references.
- [ASSUMED] Unless plan drafting discovers a live workflow that still reads those Phase 7 fixtures, rewriting them would be archive gardening rather than current-contract cleanup.

## What Phase 4 Actually Needs

### 1. Runtime/Test Closure Slice

- [VERIFIED] Phase 4 needs one focused implementation slice for the unmatched-angle-bracket invalid-markup seam in `packages/cli/src/builtin-addons/date-time/format.ts`.
- [VERIFIED] That slice must update the formatter so malformed unmatched-angle input preserves literal text while still allowing Day.js token expansion to remain visible where the Phase 3 contract says invalid markup should stay literal rather than suppress useful values.
- [VERIFIED] That slice must extend `packages/cli/src/builtin-addons/date-time/index.test.ts` with both formatter-level and mounted-render coverage for the unmatched-angle case.

### 2. Planning-Truth Closure Slice

- [VERIFIED] Phase 4 needs one focused cleanup slice for current workflow truth after the already-completed Phase 3 rerun/review path.
- [VERIFIED] The highest-signal stale artifact is `.planning/phases/03-rich-date-time-formatting-surface/03-VERIFICATION.md`.
- [ASSUMED] `STATE.md` and possibly `AGENTS.md` may need a narrow synchronization pass once the final Phase 4 implementation lands so the workflow router points at the correct next step without preserving stale Phase 3 rerun language.

### 3. Broad Fixture Cleanup Is Probably Not A Real Slice

- [VERIFIED] The main shipped example surfaces (`config.yml`, `README.md`, Phase 22 review seam) already reflect the live contract.
- [VERIFIED] The only remaining split-field fixtures appear unreferenced and historical.
- [ASSUMED] Phase 4 should not spend a dedicated wave rewriting those Phase 7 fixtures unless planning later proves they are still operator-facing or test-driven.

## Recommended Plan Shape

- [ASSUMED] The smallest truthful Phase 4 plan set is likely two waves:
  1. Fix and prove the unmatched-angle-bracket date-time formatter contract.
  2. Reconcile current planning truth for the completed Phase 3 rerun/review state and verify the final milestone handoff artifacts.
- [VERIFIED] This shape matches `TRF-07` better than a broader fixture sweep because the active shipped examples are already aligned and the remaining high-signal gaps are runtime behavior plus workflow truth.

## Risks And Constraints

- [VERIFIED] Any formatter fix must preserve the one-field `format` contract and the Phase 3 parse order: Day.js token expansion first, shared `Text` parsing second.
- [VERIFIED] Any new test/fixture seam must stay stable under workspace-root runs; the solution-store guidance says committed fixtures should be source-file-relative rather than cwd-relative.
- [VERIFIED] Planning-truth cleanup must not erase historical failure evidence in `03-UAT.md`; it should only remove stale current-state claims that are now false.
- [ASSUMED] The planner should prefer one or two narrow slices over a larger cleanup bundle so each slice remains independently verifiable and demoable.

## Planning Recommendation

- [VERIFIED] Plan Phase 4 around active contract truth only.
- [VERIFIED] Include the unmatched-angle-bracket invalid-markup bug as an explicit must-have.
- [VERIFIED] Include reconciliation of stale Phase 3 verification/current-state text as an explicit must-have.
- [ASSUMED] Exclude the old Phase 7 split-field fixtures unless a later planning check finds they are still part of a live shipped example or verification path.
