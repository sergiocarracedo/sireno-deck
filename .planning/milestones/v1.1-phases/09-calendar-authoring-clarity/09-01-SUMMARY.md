# Plan 09-01 Summary

**Completed:** 2026-05-16

## What was built
Phase 9 now ships the final built-in date/time widget for the milestone as a separate bundled `calendar-sheet` button type. The addon exposes the new type with a core-owned `60000ms` cadence, the render contract carries `variant: "calendar-sheet"` end-to-end, the renderer draws a dedicated tear-sheet calendar instead of a fallback text card, and the repo includes a committed fixture plus UAT script for reviewing the real CLI/device path.

## Key files
- `builtin-addons/date-time/src/index.ts`: adds the separate bundled `calendar-sheet` button definition with the minute-level default cadence.
- `builtin-addons/date-time/src/index.test.ts`: proves the bundled addon exposes all three date/time button types and pins the calendar-sheet cadence/render contract.
- `packages/cli/src/render/types.ts`: extends the narrow button variant union with `calendar-sheet`.
- `packages/cli/src/render/reconciler.ts`: carries `calendar-sheet` through helper, JSX, and `deck-surface` render descriptions.
- `packages/cli/src/render/reconciler.test.tsx`: verifies helper/JSX parity and `deck-surface` propagation for the new variant.
- `packages/cli/src/render/text-image.ts`: adds the dedicated tear-sheet calendar SVG branch.
- `packages/cli/src/render/text-image.test.ts`: protects the bespoke calendar visual and the shipped review path from fallback regressions.
- `packages/cli/fixtures/phase-9/config.calendar-sheet.yml`: provides the committed Phase 9 review config for the real bundled button type.
- `.planning/phases/09-calendar-authoring-clarity/09-UAT.md`: defines the concrete manual review script for the calendar visual.

## Decisions made
- Kept the calendar visual inside the existing `deck-button` variant seam instead of widening the renderer with new primitives.
- Rendered the calendar as a tear-sheet with dominant day numerals and minimal weekday/month context to stay readable on a single key.

## Deviations
- The task verification grep did not itself prove the `60000ms` literal in the fixture/UAT files, so the cadence contract remains pinned primarily by the addon definition test added earlier in this plan.

## Notes for downstream
- Plan 09-02 can extend the existing `09-UAT.md` file with the authoring-clarity review step instead of creating a second verification surface.
