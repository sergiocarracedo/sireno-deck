# Plan 51-02 Summary

**Completed:** 2026-06-08

## What was built

The system-status addon's bars button now uses the new `displayValue` field on `BarsItem` (from Plan 51-01) to show the formatted metric value (e.g. `"12.3 GB"`, `"67%"`) inside the bar via the rotated, in-bar `sireno-bars-value` element. The separate value grid that previously sat below the bars (a `displayMetrics.map(... <Text>{metric.formattedValue}</Text> ...)` block) is removed — the value now lives in one place.

## Key files

- `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx` — `barsItems` now includes `displayValue: displayMetric.formattedValue` per item. The separate value grid (the `<div className="grid gap-1">` block with formatted `Text` elements) is removed. The outer `flex flex-col justify-between` wrapper collapses to a single `overflow-hidden` container. The `Text` import is removed (no longer needed after the grid removal).
- `packages/cli/src/builtin-addons/system-status/index.test.ts` — added a new render-level test that asserts: formatted values appear inside `sireno-bars-value` elements, the separate value grid is gone (no `repeat(N, minmax(0, 1fr))` substring), and the in-bar text uses `transform:rotate(-90deg)`.

## Decisions made

- **No `themePrimaryHex` or `useSharpPath` wired up in this plan.** The DOM blend path (the default) does not need them. Wiring them through to support the sharp path is a follow-up if/when needed; it's a small, additive change in the render-time theme context. Captured as a follow-up note.
- **No new test file.** The existing render-level test in `index.test.ts:182` already covers the formatted values, so a new dedicated test (per the plan's optional guidance) is the cleaner spot for the "no separate grid" assertion. The plan allowed either approach; one new render-level test in the existing file is simpler than a new `bars.test.tsx`.
- **Outer container collapse.** Before: a `flex flex-col justify-between` with two children (bars + grid). After: a single `overflow-hidden` wrapper. The flex column + `gap-2` was a two-child layout; with one child it's noise.

## Notes for downstream

- The system-status `bars` button now relies entirely on `Bars` for value rendering. If a future iteration adds value formatting options (percent suffix, byte units, etc.), they live in `Bars.displayValue` (and downstream consumers pass them via the consumer-side `displayMetric.formattedValue`).
- The unused `Text` import was removed. If a future change reintroduces a text element in this file (e.g. a header), the import will need to be re-added.
- The other system-status button (`label-values`) is untouched by this phase.
