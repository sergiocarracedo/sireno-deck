# Plan 17-02 Summary

**Completed:** 2026-05-20

## What was built
The shared/default renderer path in `text-image.ts` now has an explicit base-shape seam instead of hiding all of that chrome inside one anonymous default branch. The pixel output stays the same, but the code now cleanly separates base-shape chrome from the content-building logic that sits inside it.

This plan also added the first explicit helper exports for base-shape consumers and moved the low-risk bundled `action` and `change-deck` buttons onto that helper path. The bundled addon tests now prove those buttons are using the helper API directly rather than depending on implicit renderer conventions.

## Key files
- `packages/cli/src/render/text-image.ts`: extracts the explicit base-shape renderer and content-building seam.
- `packages/cli/src/render/text-image.test.ts`: keeps the shared/default renderer behavior pinned after the extraction.
- `packages/cli/src/addon/api.ts`: exports explicit `icon + label` and `text` helper functions for base-shape consumers.
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.ts`: uses the explicit icon-label helper.
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.ts`: uses the explicit icon-label helper.
- `packages/cli/src/builtin-addons/core-buttons/index.test.ts`: proves the helper-backed bundled consumer path.
- `.planning/phases/17-custom-wrapper-primitives-with-addon/17-UAT.md`: records the current honest limitation around interaction-state review on the real path.

## Decisions made
- Kept the first helper API minimal: `createBaseShapeIconLabelContent()` and `createBaseShapeTextContent()` only.
- Preserved the shipped shared/default visuals while making the base-shape seam explicit in code.

## Deviations
- Fixed another pre-existing bundled-addon test import path and an existing icon-asset path in `text-image.test.ts` because the plan's verify commands were blocked by stale paths.

## Notes for downstream
- Wave 3 can now focus on making `full_surface` visibly bypass the base shape rather than trying to untangle the shared/default code structure.
- The text helper export exists now but does not yet have a first bundled consumer; that is acceptable for this phase because the first migration target stayed on icon+label buttons.
