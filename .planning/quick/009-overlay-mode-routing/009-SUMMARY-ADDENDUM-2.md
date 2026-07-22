# Quick Task 009 Summary (addendum 2)

**Task:** Two more overlay-mode routing bugs:
1. Switching to a non-autoShow overlay (e.g. warp) while chrome-overlay was
   active forced the user back to the stale chrome-overlay page instead of
   the regular deck.
2. Re-toggling chrome-overlay (toggle off → toggle on) reset to the
   overlay root, losing the paginated page the user was on.

User quote: "the overlay decks should keep its own navigation history even
on toggle".
**Completed:** 2026-07-22
**Code commit:** `eb5f013f`

## Root cause

1. `applyOverlay()` auto-switched to the new matched overlay unconditionally.
   For non-autoShow matches this activated a deck the user never asked to
   be active, and the previous overlay's state was discarded instead of
   dismissed cleanly.
2. `navigateToDeck()` with `addToHistory: false` (page-nav) set
   `transientDeckId` even when an overlay was active. The previous fix made
   `getActiveDeckId()` honor `transientDeckId`, but `setOverlay()` still
   broadcast `{ deckId }` (the overlay root), not the page the user was
   actually viewing. The stack top existed in `overlayNavStacks` but was
   never published.

## Fix

Three changes in `packages/cli/src/deck/runtime.ts`:

1. **`navigateToDeck()`** — when an overlay is active, BOTH
   `addToHistory: true` and `addToHistory: false` push onto the overlay's
   nav stack. The overlay's nav history now reflects all in-overlay
   navigation (page-nav included). `transientDeckId` stays null while
   overlay mode is on.
2. **`setOverlay(deckId)`** — when the overlay already has nav history
   (stack top ≠ `deckId`), publish `activeDeck { stackTop }` instead of
   `{ deckId }`. Re-toggling restores the page the user was on.
3. **`applyOverlay()`** — auto-switch respects `autoShow`. If the new
   match has `autoShow: true`, it replaces the current overlay; if it
   has `autoShow: false`, the current overlay dismisses and the new
   match stays as available-only. In both cases the previous overlay's
   `overlayNavStacks` entry is preserved for re-activation.

## Tests

- Updated the existing "switches overlay to the new matched overlay" test
  to use `autoShow: true` for both decks (the previous test
  accidentally relied on the unconditional switch).
- Added "dismisses current overlay when active-app switches to a
  non-autoShow overlay match".
- Updated the page-nav regression tests to reflect the new "page-nav
  pushes to overlay stack" behavior.
- Added "re-toggling an overlay after a paginated page-nav restores the
  page (overlay keeps its nav history)".

All 83 runtime tests pass. No new regressions in the broader deck
suite (the `lock-deck.test.ts` order-dependent failure is unchanged
baseline).

## Files changed

- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/__tests__/runtime.test.ts`

## Commits

- `eb5f013f` fix(runtime): page-nav within overlay pushes to overlay stack; auto-switch respects autoShow
