# Phase 4: Verification and Contract Cleanup - Context

**Gathered:** 2026-05-29
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Phase 4 is a cleanup-and-proof phase, not a redesign phase. Its job is to lock milestone `v1.3` by updating active shipped tests, fixtures, examples, and current planning truth so they match the live implementation delivered in Phases 1-3: shared `Text` owns typography and rich-markup semantics, shrink-fit remains browser-only, and built-in `date-time` uses one `format` field with Day.js-first expansion before shared `Text` parsing. Historical/archive planning material stays out of scope unless it still drives a current workflow or is presented as a live shipped reference.

## Implementation Decisions

### Scope Boundary
- Clean only active shipped surfaces: executable tests, live fixtures, current review/UAT paths, current milestone docs, and shipped examples/README references that still represent the product contract.
- Do not spend Phase 4 budget rewriting older archival planning/history files just because they mention prior contracts.
- Historical files may be touched only when they are still consumed by a live workflow or would mislead a current operator about the shipped contract.

### Contract Cleanup Focus
- Phase 4 should remove stale split date/time assumptions from active surfaces that still imply `date_format`, `time_format`, or similar pre-Phase-3 seams.
- Phase 4 includes the unmatched-angle-bracket invalid-markup edge case in the built-in `date-time` formatting path because it currently violates the intended literal-fallback-plus-expanded-values contract.
- Regression coverage must prove both the normal single-field `format` path and the invalid-markup fallback edge cases honestly.

### Fixture and Example Policy
- Update only fixtures/examples that are still shipped as active references, review paths, or verification inputs.
- Older phase-specific fixture history can remain unchanged if it is clearly archival and not part of the current product truth.
- If an old fixture is still treated as a current example, it should be normalized to the single-field `format` contract rather than merely explained away.

### Planning Truth
- Fix current-phase planning drift that would misroute or mislead active workflows, especially stale Phase 3 verification/state text after the rerun UAT and review.
- Do not broaden Phase 4 into a repo-wide planning prose sweep.
- Planning artifacts should say only what is still true now and point the next workflow at the correct step.

### Agent's Discretion
- Exact set of active shipped files that qualify for cleanup once planning confirms what is still live versus historical.
- Exact regression tests and fixture updates needed to prove the unmatched-angle-bracket fix and stale-contract cleanup honestly.
- Exact minimal doc/planning edits needed to remove current workflow drift without turning Phase 4 into archive gardening.

## Specific Ideas

- Add focused coverage for malformed unmatched-angle-bracket markup so invalid formatting still preserves expanded time/date values literally.
- Sweep active tests/examples/fixtures for stale split date/time contract references and normalize only the ones that are still presented as current.
- Reconcile Phase 3 verification/state text with the already-completed rerun UAT and review outcome.
- Keep the phase narrow: prove and clean the current contract rather than inventing more formatting features.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/01-theme-relative-typography-contract/01-CONTEXT.md`
- `.planning/phases/02-live-shrink-fit-measurement/02-CONTEXT.md`
- `.planning/phases/03-rich-date-time-formatting-surface/03-CONTEXT.md`
- `.planning/phases/03-rich-date-time-formatting-surface/03-UAT.md`
- `.planning/phases/03-rich-date-time-formatting-surface/03-VERIFICATION.md`
- `packages/cli/src/ui/Text.tsx`
- `packages/cli/src/render/theme-utilities.ts`
- `packages/cli/src/builtin-addons/date-time/format.ts`
- `packages/cli/src/builtin-addons/date-time/index.test.ts`
- `packages/cli/fixtures/phase-22/config.emulator-demo.yml`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/ui/Text.tsx`: canonical shared text surface for size, fit, tone, typography, and rich-markup rendering.
- `packages/cli/src/render/theme-utilities.ts`: source of truth for shared text size utilities and rich-text utility CSS.
- `packages/cli/src/builtin-addons/date-time/format.ts`: narrow formatter seam where invalid-markup token-preservation behavior currently drifts.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: strongest focused regression seam for the single-field `format` contract and rich/fallback date-time behavior.

### Established Patterns
- Shared `Text` owns text semantics; themes remain outer observers only.
- Shrink-fit remains browser-only and should not be widened into a broader layout rewrite in this phase.
- Date-time still owns Day.js token expansion only; shared `Text` owns the post-format rich-markup parse/render seam.
- Current planning and verification artifacts should preserve original failure evidence instead of rewriting history into a false clean pass.

### Integration Points
- Any formatter fix for unmatched `<...` input must preserve the one-field `format` contract and keep the Day.js-first then shared-`Text` handoff model intact.
- Active example fixtures and review paths need to match the same contract the tests and shipped docs describe.
- Current workflow/state artifacts must point to the real next step after Phase 3 rerun/review, or the planning layer will keep routing from stale truth.

## Deferred Ideas

- Broad archival cleanup of older milestone/phase prose that no longer drives active workflows.
- New formatting features beyond the already-shipped strict-whitelist markup contract.
- Broader text/animation/layout redesign work that belongs to a later milestone rather than Phase 4 proof-and-cleanup.

---
*Phase: 04-verification-and-contract-cleanup*
*Context gathered: 2026-05-29*
