# Plan 05-07 Summary

**Completed:** 2026-05-13

## What was built
Bundled addon SVG assets now match the icon-slot contract instead of shipping nested full-card artwork, and renderer coverage now checks the actual icon region using a shipped bundled asset. While executing the stronger test, the renderer itself also needed a small composition fix: nested SVG icon content is now inserted through a translated and scaled `<g>` transform so real icon pixels survive the rasterization path.

## Key files
- `builtin-addons/core-buttons/assets/clock.svg`: now ships a transparent icon glyph instead of a full-card asset.
- `builtin-addons/emoji-selector/assets/{favorites,back,food,nature,smileys}.svg`: now ship icon-safe transparent glyphs sized for the existing icon slot.
- `packages/cli/src/render/text-image.ts`: composes SVG icons through a translated/scaled group transform so bundled icon assets render visible pixels.
- `packages/cli/src/render/text-image.test.ts`: asserts that a shipped bundled asset changes the icon region itself, not just the overall buffer.

## Decisions made
- Kept the existing `addon://` and icon-slot contract intact rather than switching to full-surface image cards.
- Tightened the test around the icon region specifically because the previous whole-buffer comparison was too weak to catch blank-icon regressions.

## Deviations
- The plan originally scoped the fix to asset redraw plus test strengthening. During execution, the stronger test exposed that `packages/cli/src/render/text-image.ts` still needed a minimal SVG composition fix, so that file was updated in the same task to satisfy the plan's must-haves.

## Notes for downstream
- `05-08` can now rely on the icon path for emoji tiles instead of needing a parallel render strategy.
