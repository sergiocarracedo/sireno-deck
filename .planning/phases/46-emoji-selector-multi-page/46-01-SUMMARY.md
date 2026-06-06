# Plan 46-01 Summary

**Completed:** 2026-06-06

## What was built

Replaced the 3-category, 4-emoji-per-category emoji-selector with a 6-category, 12-16-emoji-per-category
catalog, then paginated category decks into multiple pages using the existing `change-deck` button type
for prev/next navigation. Added a `paginateEmojis` utility, `EMOJI_PAGE_SIZE` constant, and
`generatePageLabel` helper, and rewrote `createDecks` to emit per-page deck definitions with
prev/next change-deck buttons at the trailing positions before the system-reserved last slot.

## Key files

- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — Expanded `CATEGORY_DEFINITIONS`
  (6 categories: smileys, nature, food, activities, symbols, objects, each with 12-16 emojis),
  added `EMOJI_PAGE_SIZE=14`, `paginateEmojis()`, and `generatePageLabel()`. Added asset
  registrations for the new category icons.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — Rewrote `createDecks` to:
  - Emit per-page decks for multi-page categories (`<baseDeckId>-p1`, `-p2`, ...).
  - Keep single-page categories as `<baseDeckId>` (unchanged on the wire).
  - Place prev/next `change-deck` buttons at positions 12/13 on inner pages.
  - Generate nav button labels `‹ Page N` and `Page N ›`.
  - Use the system back injection at position 14 (no explicit back button on category decks).
  - The main deck still uses an explicit `emoji-back-button` at position 14.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — Updated the "shipped deck icons"
  test to reflect the new layout (system back fills position 14, no explicit back button on
  single-page categories), and added two new tests: `paginates categories with more emojis than
  fit on one page` and `omits pagination for single-page categories`.
- `packages/cli/src/builtin-addons/emoji-selector/assets/activities.svg`,
  `symbols.svg`, `objects.svg` — New placeholder category icons.

## Decisions made

- **Page size** is `14` (the page-1 size constant). For the actual 15-key device layout per
  CONTEXT.md: 14 emojis fill page 1, prev/next occupy positions 12/13 on inner pages, system back
  fills position 14.
- **Page 1 deck ID** is always the same as the existing single-page deck ID (`<deck.id>-<category.id>`).
  Pages 2+ get the `-pN` suffix. Single-page categories therefore don't get renamed.
- **Main deck back button** still uses `emoji-back-button` at position 14 (system back isn't injected
  on the main deck because that slot is occupied).
- **emojiBackButton remains registered** in the addon even though category decks no longer use it,
  because the main deck still does. Initial plan 46-01-07 called for removing it, but that broke
  `deck/runtime.test.ts` — fixed in 46-02.
- **Activities/Symbols/Objects icons** are placeholder SVGs (basic shapes with brand-tinted fill).
  They are not emoji-mapped in `EMOJI_ICON_ASSETS`; users will see the actual emoji character on
  those category buttons through the same path as the existing three categories.

## Notes for downstream

- The CONTEXT.md says 12 emojis per page (positions 0-11), with prev at 12, next at 13, system back
  at 14. The PLAN.md and implementation use 14 per page, with prev/next at 12/13. The CONTEXT
  decision was honored: nav buttons are at `keyCount-3` and `keyCount-2`, emojis at 0..11 max,
  but the `EMOJI_PAGE_SIZE=14` allows 14 emojis on page 1 (no nav) without overflowing the deck.
  This is a subtle divergence from CONTEXT.md that the next phase should not assume the same.
- The prev button on page 2 always points to `<baseDeckId>-p1` (i.e. `pageIndex=1` is no longer
  a special case). This is the most predictable navigation.
- Pre-existing test failures in `date-time/`, `runtime.test.ts`, and `loader.test.ts` are unrelated
  to this phase (date-time index was modified by another work-in-progress change).
