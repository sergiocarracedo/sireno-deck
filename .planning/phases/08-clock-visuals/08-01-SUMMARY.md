# Plan 08-01 Summary

**Completed:** 2026-05-15

## What was built
Phase 8's first tracer bullet now ships a separate built-in `analog-clock` button type alongside the existing digital `date-time` button. The addon drives that button through the existing core-owned 1000ms cadence, the reconciler/runtime contract now carries `variant: "analog-clock"` end-to-end, and the renderer produces a dedicated analog face instead of falling back to the shared text card.

## Key files
- `builtin-addons/date-time/src/index.ts`: adds the separate `analog-clock` button definition and keeps the digital button contract intact.
- `builtin-addons/date-time/src/index.test.ts`: verifies the bundled addon exposes both button types and that the analog clock remains a real live renderable button.
- `packages/cli/src/render/types.ts`: extends the narrow render variant contract to include `analog-clock`.
- `packages/cli/src/render/reconciler.ts`: carries `analog-clock` through helper, JSX, and `deck-surface` collection into `RenderDescription`.
- `packages/cli/src/render/reconciler.test.tsx`: proves helper/JSX parity and surface propagation for analog-clock buttons.
- `packages/cli/src/render/text-image.ts`: adds the isolated analog clock SVG branch with live hand positions derived at render time.
- `packages/cli/src/render/text-image.test.ts`: verifies the analog clock is visibly distinct from the default card and changes materially across times.

## Decisions made
- Kept the analog clock as a separate button type and a single new `deck-button` variant instead of widening the render model with new primitives.
- Derived analog hand positions from render-time clock state so the transport contract stays narrow while tests remain deterministic through mocked system time.

## Deviations
- None.

## Notes for downstream
- Plan 08-02 can now anchor its fixture and UAT path to a real shipped `analog-clock` type rather than a synthetic renderer-only setup.
