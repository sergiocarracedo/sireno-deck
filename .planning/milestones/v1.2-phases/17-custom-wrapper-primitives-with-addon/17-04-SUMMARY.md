# Plan 17-04 Summary

**Completed:** 2026-05-21

## What was built
This gap-closure slice fixed the real Phase 17 failure seam instead of the renderer in isolation. The shipped CLI/device render path now forwards `full_surface` into `renderTextImage()`, so explicit full-surface buttons can actually bypass the base card on the live device path rather than only in renderer unit tests.

This plan also added focused start-path regression coverage so a future transport regression cannot silently drop `full_surface` again while lower-level renderer tests still pass.

## Key files
- `packages/cli/src/cli/commands/start.ts`: centralizes the live render payload mapping and forwards `full_surface` through both real render call sites.
- `packages/cli/src/cli/commands/start.test.ts`: proves the shipped start-path transport preserves explicit full-surface behavior while keeping wrapper compatibility narrow.
- `.planning/phases/17-custom-wrapper-primitives-with-addon/17-UAT.md`: keeps the failed manual checks plus diagnosed root cause and affected files as the audit trail for the rerun.

## Decisions made
- Fixed the upstream transport seam in `start.ts` instead of redesigning the base-shape/helper model, because that was the confirmed cause of the UAT failure.
- Added one exported helper for render payload assembly so the exact shipped seam can be regression-tested directly.

## Deviations
- None.

## Notes for downstream
- Phase 17 needs manual UAT rerun to confirm the real device surface now reflects the fixed `full_surface` transport.
- The helper-vs-component design concern remains separate from this regression and should only be revisited if later planning chooses to widen the composition model.
