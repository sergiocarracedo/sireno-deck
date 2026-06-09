# Plan 17-03 Summary

**Completed:** 2026-05-20

## What was built
The explicit `full_surface` escape hatch is now visibly different from the default base shape on the real render path. Full-surface buttons bypass the shared/default card chrome and render as a flatter full-bleed surface, while the default base-shape path still keeps the familiar card frame, accent strip, and badge treatment.

This plan also expanded the committed Phase 17 fixture/UAT path so reviewers can judge both behaviors side by side on the real CLI/device surface instead of relying only on unit tests.

## Key files
- `packages/cli/src/render/text-image.ts`: adds the explicit full-surface SVG path and routes `full_surface` away from the base-shape card.
- `packages/cli/src/render/text-image.test.ts`: pins the visible difference between base-shape and full-surface rendering.
- `packages/cli/src/deck/runtime.test.ts`: proves valid full-surface render descriptions survive the runtime seam.
- `packages/cli/fixtures/phase-17/config.button-shape-composition.yml`: committed Phase 17 fixture that shows legacy wrapper compatibility and explicit full-surface rendering together.
- `.planning/phases/17-custom-wrapper-primitives-with-addon/17-UAT.md`: manual review path with concrete expected outcomes for both rendering modes.

## Decisions made
- Chose a visibly flatter full-surface treatment instead of trying to preserve subtle similarities with the base-shape card, because the review artifact needed an obvious user-facing difference.

## Deviations
- None.

## Notes for downstream
- Phase 17 is now ready for manual UAT and phase-level verification.
- The remaining honest gap is interaction-state visibility on the real device path; the UAT file documents that limitation explicitly.
