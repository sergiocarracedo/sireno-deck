---
status: complete
phase: 46-emoji-selector-multi-page
source: 46-01-SUMMARY.md, 46-02-SUMMARY.md
started: 2026-06-06T11:32:00Z
updated: 2026-06-06T11:35:00Z
---

## Current Test
number: 5
name: Page label format follows "Category (N/M)"
expected: |
  The deck title for any multi-page page 2+ reads "Smileys (2/2)" or
  "Food (2/2)". Single-page category decks show just "Nature"
  (no page suffix).
awaiting: user response (likely blocked — see test 3 issue)

## Tests

### 1. Emoji catalog expanded to 6 categories
expected: Main deck shows 6 category buttons (Smileys, Nature, Food, Activities, Symbols, Objects) when the emoji-selector deck is loaded. Each category has 12-16 emojis (visible by tapping into the category and counting).
result: pass

### 2. Single-page categories stay as one deck (Nature has 12 emojis)
expected: Tapping Nature shows 12 emojis on a single page with no prev/next nav buttons. Position 14 is the system back button.
result: issue
reported: "no back button in 14"
severity: major

### 3. Multi-page categories split (Smileys has 16 emojis)
expected: Tapping Smileys shows page 1 with 12-14 emojis and a "Page 2 ›" next button. Position 14 is the system back button (no prev on page 1).
result: issue
reported: |
  DeckNavigationError: Deck 'emoji-smileys' is not defined. Main deck's
  category button points to 'emoji-smileys' but the actual deck is
  'emoji-smileys-p1' for multi-page categories.
severity: blocker

### 4. Page 2 of a multi-page category has prev button
expected: Tapping "Page 2 ›" navigates to "Smileys (2/2)". The page shows the remaining emojis (2-4 of them), a "‹ Page 1" prev button, and the system back at position 14 (no next on the last page).
result: skipped
reason: "Blocked by test 3 issue — multi-page category navigation broken"

### 5. Page label format follows "Category (N/M)"
expected: The deck title for any multi-page page 2+ reads "Smileys (2/2)" or "Food (2/2)". Single-page category decks show just "Nature" (no page suffix).
result: pending

### 6. System back button works on category decks
expected: Tapping position 14 on any category deck navigates back to the emoji-selector main deck. This is the system-reserved back slot, not a custom button.
result: pending

### 7. Main deck back button still works
expected: On the emoji-selector main deck, position 14 is the explicit `emoji-back-button` (visible icon + "Back" label). Tapping it navigates back to the previous deck in the navigation stack (or to the home deck on hold).
result: pending

### 8. Empty favorites: no favorites category
expected: With `favorites: []` in the config, the main deck does not show a "Favorites" category button. Only the 6 emoji categories are shown.
result: pending

### 9. Non-empty favorites: shown first
expected: With `favorites: ['😀', '🔥']` (or any non-empty list), the main deck shows a "Favorites" category button at position 0, before the 6 emoji categories. Tapping it shows the favorites emojis.
result: pending

### 10. Favorites paginate when >14 emojis
expected: Configuring more than 14 favorites produces a paginated favorites deck (e.g. `emoji-favorites-p1`, `emoji-favorites-p2`) with prev/next navigation, same logic as regular categories.
result: pending

## Summary

total: 10
passed: 1
issues: 2
pending: 6
skipped: 1

## Gaps

- truth: "Position 14 on category decks is the system back button (SRB-03)"
  status: failed
  reason: "User reported: no back button in 14 (and confirmed again on multi-page deck)"
  severity: major
  test: 2
- truth: "Tapping a multi-page category on the main deck navigates to its page 1"
  status: failed
  reason: |
    DeckNavigationError: Deck 'emoji-smileys' is not defined. Main deck's
    category button target_deck is 'emoji-smileys' (baseDeckId), but for
    multi-page categories the actual deck ID is 'emoji-smileys-p1'.
  severity: blocker
  root_cause: |
    In `index.ts:135`, the main deck's category button uses
    `category.deckIdPrefix` as target_deck, but for multi-page
    categories the generated deck ID is `${baseDeckId}-p1`. The main
    deck should target the first page's actual deck ID.
  affected_files:
    - packages/cli/src/builtin-addons/emoji-selector/index.ts
  test: 3

## Notes for UAT

- Pre-existing test failures in `date-time/`, `runtime.test.ts`, `loader.test.ts`, and `core-buttons/index.test.ts` are unrelated to Phase 46 (per plan SUMMARY). Only the emoji-selector test file is in scope.
- Known layout concern to verify on hardware: the implementation places `next` at position 13 (keyCount-2) on page 1, but `EMOJI_PAGE_SIZE=14` means page 1 of a multi-page category emits 14 emojis at positions 0-13. The buttons array will contain both an emoji-entry-button at position 13 and a change-deck (next) at position 13. The runtime's behavior on duplicate positions should be verified visually — if the runtime uses last-defined-wins, emoji[13] may be hidden by the next button.
