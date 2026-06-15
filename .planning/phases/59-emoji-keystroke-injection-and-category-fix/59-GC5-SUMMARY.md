# Plan 59-GC5 Summary

**Completed:** 2026-06-12

## What was built

All three emoji-selector buttons (entry, category, back) now use the renamed `MainLabelSurface` (from Plan 59-GC4) and have a non-empty label. Previously, the entry button had two divergent render paths: 12 emojis with custom icons showed a short label (e.g., "GRIN") + icon, while the other 371 emojis showed the emoji char as text only with no label. Now every entry button shows the emoji char (or custom icon) above the category label (e.g., "Smileys").

The local `createButtonNode` helper is removed. The `isIconSource` logic is now centralized in the new `MainLabelSurface` component.

## Key files

- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — render body simplified to a single `<MainLabelSurface main={EMOJI_ICON_ASSETS[config.emoji] ?? config.emoji} label={config.label} />`. Removed imports of `createButtonNode`, `getEmojiFallbackLabel`, `renderEmojiGlyph`.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/category.tsx` — render body now `<MainLabelSurface main={config.icon} label={config.label} />`. Removed `createButtonNode` import.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/back.tsx` — render body now `<MainLabelSurface main={config.icon} label={config.label} />`. Removed `createButtonNode` import.
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — removed `createButtonNode`, `isIconSource` (local copy), and the dead-code `getEmojiFallbackLabel` function. Cleaned up the now-unused `Icon` import (kept `Label`, `Text`).
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — `'renders bundled icon-backed emoji entry buttons for shipped emoji values'` updated to expect the category label `Smileys` instead of `GRIN` (and removed the `<img` check since the icon is now rendered via `<Icon>` which produces `<svg>`). `'renders the real unicode glyph for non-branded emojis via the native font stack'` updated to expect the category label `Custom`; removed the `text-5xl` assertion (the new surface uses `text-3xl`).
- `packages/cli/src/deck/__tests__/runtime.test.ts` — `'navigates generated emoji decks and pastes the favorite on tap'` updated to expect `Favorites` (the category label) instead of `GRIN`.

## Decisions made

- **Category label (`config.label`) chosen as the universal entry-button label.** It's already in the entry button config (set by the deck generator as `label: category.label` in `index.ts:96`) and is meaningful UX. The user said "all the emojis has label" but didn't specify what the label should be. Options considered:
  - Category label (e.g., "Smileys") — chosen; consistent across the category, already in config.
  - Shortcode (e.g., `:grinning:`) — would require shortcode lookup for every emoji, slow and ugly.
  - Emoji char itself — redundant with the visual.
  - User can adjust the choice in the surface call site if they prefer a different label.
- **Dead-code cleanup**: removed `getEmojiFallbackLabel` (only used in the now-deleted `createButtonNode` path) and the `Icon` import from `support.tsx` (only used in `createButtonNode`). The `renderEmojiGlyph` function was kept in `support.tsx` for any future use (e.g., the launcher button's emoji grid uses it), but no longer called by the entry button.
- **No changes to the category deck generator** (`index.ts`). The entry buttons' config still has `label: category.label` per emoji, which is the source of the new label.

## Notes for downstream

- Every emoji entry button now renders with a category label. This is a UX improvement that was implicit in the user's request: a 13-button grid of emojis with no labels is hard to scan; adding the category name (e.g., "Smileys") under each emoji makes the grid much more navigable.
- The 1 net test improvement (129 → 128 failures) is from the test that was updated to expect the new behavior — the underlying logic is unchanged.
- The `renderEmojiGlyph` helper is kept (for the launcher button's emoji grid, which renders the 6 launcher emojis as text). It can be removed in a future cleanup if it's not used elsewhere; currently it has at least one other caller (the launcher button) so it's not dead code.
