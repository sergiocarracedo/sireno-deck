# Plan 03-02 Summary

**Completed:** 2026-05-29

## What was built
Phase 3's second slice threaded the built-in date-time button through the new shared rich-text seam without reviving split config fields or widget-local parsing. The date-time formatter now preserves markup literal segments around Day.js token expansion, the resulting string flows through shared `Text`, and the repo ships both mounted-test proof and one committed emulator review path for the real single-field `format` contract.

## Key files
- `packages/cli/src/builtin-addons/date-time/format.ts`: split the `format` string into markup and text segments so Day.js formats only plain text spans while `<...>` markup survives intact.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: added coverage for nested rich markup, literal fallback on invalid markup, and mounted date-time rendering through the real shared `Text` seam.
- `packages/cli/fixtures/phase-22/config.emulator-demo.yml`: replaced the old review fixture content with a real Phase 3 rich date-time review path on built-in `date-time`.
- `.planning/phases/03-rich-date-time-formatting-surface/03-UAT.md`: seeded the manual review script and expected outcomes, including the always-on blink tradeoff.

## Decisions made
- Kept one `format` field and Day.js as the token engine instead of inventing a second date-format language.
- Preserved markup literals before shared `Text` parsing rather than teaching the date-time widget its own rich renderer.
- Documented blink honestly as always-on product behavior for this phase instead of calling it reduced-motion-safe.

## Notes for downstream
- Any future changes to date-time formatting must keep the parse order intact: Day.js token expansion first, shared `Text` parsing second.
- The committed Phase 22 fixture is now the real Phase 3 review seam and should stay aligned with the shipped single-field date-time contract.
