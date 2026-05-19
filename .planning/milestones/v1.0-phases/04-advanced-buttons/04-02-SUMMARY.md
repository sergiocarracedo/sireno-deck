# Plan 04-02 Summary

**Completed:** 2026-05-12

## What was built
Added CPU and memory button support on top of the Phase 4 polling foundation. The CLI now has a narrow `systeminformation` adapter for live metrics, validated `cpu` and `memory` button schemas, and runtime/render wiring so these buttons update only on the active deck and render as richer metric cards with percentage/progress output.

## Key files
- `packages/cli/src/system/live-metrics.ts`: wraps `systeminformation` for CPU and memory snapshots
- `packages/cli/src/core/schemas.ts`: adds `cpu` and `memory` button schemas and display-mode validation
- `packages/cli/src/deck/runtime.ts`: refreshes CPU and memory buttons through the active-deck polling lifecycle
- `packages/cli/src/render/text-image.ts`: renders metric value/progress visuals in the existing SVG -> sharp path
- `packages/cli/src/system/live-metrics.test.ts`: verifies metric normalization from deterministic adapter inputs

## Decisions made
- Reused the expanded render payload from 04-01 and added only `displayValue` and `progress` for metrics rather than inventing a separate metric renderer API.
- Derived memory usage from `active / total` to align with the adapter's server-side usage model and keep the button output stable.

## Deviations
- `04-02-02` and `04-02-03` were verified together with the full CLI test suite because the runtime metric wiring and metric rendering assertions are coupled tightly. No functional deviation from the plan.

## Notes for downstream
- Fan buttons can extend `packages/cli/src/system/live-metrics.ts` rather than introducing a second system-information boundary.
- `variant: "metric"` is now established for rich live-data cards, so fan/media should only widen the render payload further if their layouts truly need extra fields.
