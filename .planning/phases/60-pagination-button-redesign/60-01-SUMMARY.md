# Plan 60-01 Summary

**Completed:** 2026-06-12

## What was built

Replaced the chip-based pagination button with a 3-line text layout. The pagination button now shows "Tap >" / "< 2xTap" / "Page X/Y" using the shared `<Label>` component (per PAG-03). `currentPage` and `totalPages` are threaded through `PageNavButtonConfig` so the render can show the page indicator without runtime introspection. Tap/dbltap lines are hidden on the unavailable page (last page hides "Tap >", first page hides "< 2xTap").

## Key files

- `packages/cli/src/core/pagination.ts` — `PageNavButtonConfig` extended with `currentPage: number, totalPages: number`. `buildPageNavButton` threads these into the returned config.
- `packages/cli/src/core/pagination.test.ts` — middle-page `toEqual` assertion updated to include the new fields. New test `'threads currentPage and totalPages into the returned config'`. The page-nav render describe block now has 3 tests (middle, first, last) instead of 1 (the old single test that checked for chip elements).
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — `renderPageNavContent` replaced with a 3-line `<Label>` layout. No-op logic uses `isFirstPage` (hides "< 2xTap") and `isLastPage` (hides "Tap >") derived from the new config fields. The `BuiltinChangeDeckButtonSchema` is updated with optional `currentPage` and `totalPages` (so the strict validation accepts the new fields). Unused `Chip` import removed.

## Decisions made

- **No-op logic uses `isFirstPage`/`isLastPage`, not `target_deck === target_deck_double_tap`.** The original code's `tapNoop`/`doubleTapNoop` heuristic (comparing the two target decks) never actually triggered because `buildPageNavButton` always sets them to different decks even on edge pages. The cleaner check is direct: `currentPage === 1` (first) or `currentPage === totalPages` (last).
- **`<Label>` is used for each of the 3 lines** (per PAG-03). The shared component handles overflow via `fit="ellipsis"`, satisfying the "no overflow at any page count" requirement.
- **The `isMainDeck` branch (position 14) keeps the chevron-only render** — that's the system back button, not the page-nav itself, and was unchanged.
- **`Chip` import removed from `change-deck.tsx`** — no other code path in the file used it.
- **`BuiltinChangeDeckButtonSchema` extended with `currentPage` and `totalPages` as `.optional()`** — the schema is `.strict()` and would have rejected the new fields otherwise. The new fields are optional because non-page-nav change-deck buttons (e.g., the system back button, the chrome deck) don't carry them.

## Notes for downstream

- 2 pagination-related pre-existing test failures (text-5xl vs text-2xl size mismatch in the emoji entry button's unicode glyph render; pagination assertion) are unrelated to this plan and remain baseline failures from uncommitted Phase 60/61 work.
- The render in `change-deck.tsx` uses `config as PageNavButtonConfig` to cast the validated config. This is a safe cast because the `meta === 'page-nav'` discriminator guarantees the config was built by `buildPageNavButton`.
- Manual UAT on real hardware deferred to the user per the verify-work convention.
- The `-p{N}` suffix pattern is duplicated between `pagination.ts` and `system-buttons.ts` (see prior art solution). Not in scope for this phase; a future cleanup could DRY this.
