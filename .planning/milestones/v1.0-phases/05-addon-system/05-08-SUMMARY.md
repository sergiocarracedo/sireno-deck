# Plan 05-08 Summary

**Completed:** 2026-05-13

## What was built
The bundled emoji selector now renders real image-backed tiles again for the shipped emoji set instead of relying on ASCII aliases as the primary visual. Each built-in emoji used by the category decks is backed by a bundled SVG asset, and the addon keeps one explicit text fallback for unsupported custom emoji values so favorites and deck generation remain stable.

## Key files
- `builtin-addons/emoji-selector/src/index.ts`: maps built-in emoji values to bundled `addon://` icon assets and uses text fallback only for unsupported values.
- `builtin-addons/emoji-selector/assets/emoji-*.svg`: bundled icon assets for the shipped emoji set used by category decks and sample favorites.
- `builtin-addons/emoji-selector/src/index.test.ts`: verifies image-backed entry rendering plus the unsupported-emoji fallback path.
- `packages/cli/src/deck/runtime.test.ts`: proves favorites navigation still works while rendered emoji entries now carry bundled icon assets.

## Decisions made
- Kept the fallback text path for unsupported emoji values instead of failing deck generation or silently dropping entries.
- Reused the existing icon render contract from `05-07` rather than introducing a second emoji-specific image pipeline.

## Deviations
- None.

## Notes for downstream
- Re-running hardware UAT should now validate both category-icon visibility and image-backed emoji entry tiles in one pass.
