# Plan 74-01 Summary

**Completed:** 2026-06-18

## What was built

`system-status-label-values` schema now caps `metrics` at 1-2 entries via `z.array(LabelValueMetricSchema).min(1).max(2, "...")`. The custom error message points users to the `value-display` addon (FEAT-02) when they configure 3+ metrics. Bars schema is unchanged (still allows 1-3). All existing 1-2 metric configs still parse.

## Key files

- `packages/cli/src/builtin-addons/system-status/schemas.ts`: Replaced 4-tuple union with `z.array(...).min(1).max(2, "msg")` in `SystemStatusLabelValuesButtonSchema`
- `packages/cli/src/builtin-addons/system-status/index.test.ts`: Added test asserting 3+ metric configs are rejected with value-display hint
- `.planning/ROADMAP.md`: Phase 74 success criteria updated — dropped Bars-related items, marked phase ✓ Executed
- `.planning/REQUIREMENTS.md`: BUG-07 entry marked as `Deferred for v1.7` with reference to discussion log

## Decisions made

- Used `.max(2, "msg")` directly (not `.superRefine()`) to keep schema as `ZodArray` not `ZodEffects`. This preserves `.shape` consumers (see prior solution `zod-refine-silently-breaks-shape-consumers-2026-06-09.md`).
- Custom error message on `.max(2, "...")` only — the `.min(1)` constraint keeps its default "Array must contain at least 1 element(s)" since 0 metrics is a config typo, not the primary case we're guarding.

## Notes for downstream

- Bars schema (`SystemStatusBarsButtonSchema`) is intentionally untouched — it still uses tuple union for 1-3 metrics.
- The runtime `label-values.tsx` button doesn't need changes — it supports any length, the schema enforces the cap.
- BUG-07 (Bars formatter prop) is documented as deferred in REQUIREMENTS.md. The existing `displayValue` field on `BarsItem` + system-status addon's `SystemStatusFormatter` enum cover the formatting use case.