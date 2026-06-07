---
status: testing
phase: 49-emoji-selector-ux-revamp
source: 49-01..49-07 SUMMARY.md
started: 2026-06-07T11:00:00Z
updated: 2026-06-07T11:00:00Z
---

## Current Test
number: 1
name: Subcategories show on first drill-in (49-01)
expected: |
  From the main deck, tap the "Smileys" tile.
  The next deck shows subcategories (Happy / Sad / Laughing / …) —
  not the full emoji list. Tapping a subcategory drills into that
  subset of emojis.
awaiting: user response

## Tests

### 1. Subcategories show on first drill-in (49-01)
expected: Tapping a category tile drills into subcategories, not the raw emoji list.
result: pending

### 2. Branded social icons render (49-02)
expected: A share button bound to a brand (Twitter / Slack / Discord / GitHub) renders the brand's SVG mark, not a generic emoji glyph.
result: pending

### 3. system_back_tap_command overrides default (49-03)
expected: With `system_back_tap_command: "<command>"` set on a deck, tapping the bottom-right system back runs that command via the action executor instead of `goBack`.
result: pending

### 4. system_back_hold_command overrides default (49-03)
expected: With `system_back_hold_command: "<command>"` set, holding the system back ≥600ms runs that command via the action executor instead of `restoreStack`.
result: pending

### 5. Launcher sits top-left of main deck (49-04)
expected: On the main deck, the top-left tile is the emoji-selector launcher — a 2×3 grid of category entry points (Smileys, People, Animals, Nature, Food, Drink).
result: pending

### 6. Tap delivers emoji to focused window (49-05)
expected: With a text input focused, tapping an emoji button on the deck inserts that emoji into the input. Mechanism: clipboardy write → paste keystroke. Requires a host clipboard tool (`pbcopy` / `xclip` / `wl-copy` / `clip.exe`).
result: pending

### 7. Double-tap delivers shortcode (49-05)
expected: Double-tapping an emoji whose catalog entry has a shortcode inserts `:<shortcode>:` into the focused input. Same host prerequisites as test 6.
result: pending

### 8. select_command override (49-05)
expected: A button with `select_command: "echo {{emoji}}"` runs that command (with template substitution) via the action executor instead of the paste path.
result: pending

### 9. No-history page navigation (49-06 + 49-07)
expected: In a paginated category (e.g. "Smileys"), tapping "next page" 3 times then tapping the system back returns to the main deck — not to the previous page of "Smileys". The deck stack is `[main, last-page]` after the walk.
result: pending

### 10. Page-nav chips share the Chip style (49-07)
expected: Page-nav buttons on a paginated deck render as `Chip` components — visually consistent with the deck's other navigation chips, not raw Tailwind divs with `text-[10px] opacity-70`.
result: pending

### 11. paginateDecks is reusable (49-07)
expected: A second addon that imports `paginateDecks` from `@sireno-deck/core/pagination` can paginate its own deck and get the same slice / page-count / page-nav semantics without re-implementing them.
result: pending

## Summary
total: 11
passed: 0
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]

## Host prerequisites (no items deferred — just the prerequisite for tests 6, 7, 8)

- A clipboard tool installed on the host: `pbcopy` (macOS) / `xclip` or `wl-copy` (Linux) / `clip.exe` (Windows). The CLI surfaces a structured error if none is found.
- A focused text-input target window for tests 6 and 7 (the paste keystroke targets the active focused window).
