# Plan 46-03 Summary

**Completed:** 2026-06-06

## What was built

Fixed the multi-page emoji-selector main-deck navigation by using each category's actual first-page deck ID as the category button's `target_deck` instead of the base deck ID prefix. Multi-page categories now resolve to `emoji-smileys-p1` (and similar `${base}-p1` IDs), which is the real deck ID `createDecks` registers. Single-page categories are unaffected (their first page ID equals the base deck ID).

The refactor captures `firstPageDeckIds` inside the existing per-category page loop and uses them in the main-deck button map, avoiding any duplicated page-loop logic.

## Key files

- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — Added `firstPageDeckIds` array captured during the page loop; main-deck `emoji-category-button` `target_deck` now uses `firstPageDeckIds[index]` instead of `category.deckIdPrefix`.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — New regression test: `targets the actual first-page deck ID for multi-page categories on the main deck`, asserting `Smileys` (a 16-emoji multi-page category) resolves to `target_deck: 'emoji-smileys-p1'`.

## Decisions made

- Captured the first page's `pageDeckId` per category inside the existing `for (let pageIndex = 0; pageIndex < pages.length; ...)` loop and pushed it to `firstPageDeckIds` only on the first iteration. This kept the change to one localized spot in `createDecks` and avoided a second pass over the categories.
- The regression test uses an empty `favorites` array so it exercises the bundled category path (Smileys is multi-page in the bundled data). The pre-existing favorites-first test was unchanged.

## Notes for downstream

- `firstPageDeckIds` is populated in the same order as `orderedCategories`, so `firstPageDeckIds[index]` lines up with `orderedCategories[index]` for the main-deck button map. The pre-existing favorites test relies on this index alignment and continues to pass.
- The 46-04 system-back-injection plan depends on the main-deck category button still landing on a real registered deck; this fix restores that contract for multi-page categories.
