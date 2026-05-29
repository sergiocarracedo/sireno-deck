# Plan 04-01 Summary

**Completed:** 2026-05-29

## What was built
Phase 4's first slice closed the one remaining active runtime gap in the built-in `date-time` formatter. Malformed unmatched-angle input now preserves the broken tag-like prefix literally while still letting Day.js expand the useful time/date tokens that follow, and focused regression coverage proves both the raw formatter output and the mounted shared-`Text` fallback path.

## Key files
- `packages/cli/src/builtin-addons/date-time/format.ts`: preserves malformed unmatched-angle prefixes as Day.js literals instead of letting them suppress or corrupt token expansion.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: adds formatter-level and mounted-render regression coverage for the unmatched-angle invalid-markup case alongside the existing nested-invalid case.

## Decisions made
- Kept the fix inside the formatter seam instead of teaching shared `Text` or the widget its own special invalid-markup behavior.
- Preserved the one-field `format` contract and Day.js-first then shared `Text` parse order by escaping only the malformed tag-like prefix literally.

## Deviations
- None.

## Notes for downstream
- The unmatched-angle case is now distinct from the nested-invalid case in tests; future formatter changes need to preserve both invalid-markup shapes.
