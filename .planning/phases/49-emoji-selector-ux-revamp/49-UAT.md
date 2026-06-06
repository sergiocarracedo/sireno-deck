---
status: testing
phase: 49-emoji-selector-ux-revamp
source: 49-01-SUMMARY.md, 49-02-SUMMARY.md, 49-03-SUMMARY.md, 49-04-SUMMARY.md
started: 2026-06-06T17:30:00Z
updated: 2026-06-06T17:30:00Z
---

## Current Test
number: 1
name: Cold-start smoke test
expected: |
  Kill any running sireno daemon. Start fresh with the bundled emoji-selector config.
  Run: `cd packages/cli && pnpm cli:dev start --config config.yml`
  Expected: daemon boots, the Stream Deck + emulator shows the emoji-selector main deck, no crash, no error log, no missing-button warnings.
awaiting: user response

## Tests

### 1. Cold-start smoke test
expected: Daemon boots with emoji-selector enabled. Main deck renders without errors.
result: pending

### 2. Tap delivers emoji via per-OS HID shim
expected: With OS detected as Linux: pressing an emoji button (e.g. 🔥) runs `xdotool type --clearmodifiers '🔥'`. On Mac: clipboard paste via osascript. On Windows: Set-Clipboard + SendKeys. The focused window receives the typed emoji.
result: pending

### 3. Double-tap delivers the conventional shortcode via HID
expected: Double-pressing 🔥 within 300ms types the shortcode (e.g. `:fire:`) via the same per-OS HID shim. Single tap still types the emoji.
result: pending

### 4. 11 pre-split subcategories load from JSON
expected: Main deck shows categories Smileys, People, Animals, Nature, Food, Drink, Activities, Travel, Objects, Symbols, Flags. No composite categories like "Smileys and People".
result: pending

### 5. User can override the default HID command via select_command
expected: When config sets `select_command: "xdotool type --delay 50 '{{emoji}}'"`, the user's command runs (with the `{{emoji}}` placeholder substituted) instead of the per-OS default. Same for `select_command_shortcode` on double-tap.
result: pending

### 6. Emoji entries render the real unicode glyph (not U+1Fxxx placeholder)
expected: Pressing an emoji button (e.g. 😂) on the deck/emulator shows the actual rendered glyph from the platform emoji font, not the literal text "U+1F602".
result: pending

### 7. 12 branded SVG icons remain as deliberate overrides
expected: The 12 emojis that have branded SVGs (rainbow, wave, leaf, berry, fire, leaf, sun, coffee, etc.) render via their bundled SVG instead of the real-glyph path. Other emojis use the real-glyph path.
result: pending

### 8. n-2 page nav button at position 13 with Tap/Dbl Tap chip overlays
expected: On a multi-page category (e.g. Smileys, Drink, Symbols), the bottom-right button shows a chevron with "Tap" in the top-left and "Dbl Tap" in the bottom-right. On the first page, only "Tap" is shown. On the last page, only "Dbl Tap" is shown.
result: pending

### 9. Tap on the page nav navigates to the next page
expected: Pressing the n-2 button on page 1 navigates to page 2 (the deck label changes from "Smileys (1/4)" to "Smileys (2/4)"). On the last page, tap is a no-op.
result: pending

### 10. Double-tap on the page nav navigates to the previous page
expected: Double-pressing the n-2 button on page 2 navigates to page 1. On the first page, double-tap is a no-op.
result: pending

### 11. System back runs the deck-decorated tap command
expected: On a subdeck with `system_back_tap_command: "sireno-navigate --back"` set, the system back tap (bottom-right button) runs that command via the action executor instead of navigating to the previous deck. Default goBack behavior is preserved when the field is unset.
result: pending

### 12. System back runs the deck-decorated hold command
expected: On a subdeck with `system_back_hold_command: "sireno-navigate --home"` set, the system back hold (≥600ms) runs that command instead of the default restoreStack. Default behavior preserved when unset.
result: pending

### 13. emoji-launcher renders 2×3 grid of six emojis
expected: Adding `{ type: 'emoji-launcher', label: 'Emoji' }` to a deck config renders a button with a 2×3 CSS grid showing 😂 🔥 ❤️ ⭐ 🍕 🎵. Each cell renders the real glyph via the native font stack.
result: pending

### 14. emoji-launcher sits at position 0 of the main deck
expected: The emoji-selector main deck places the launcher at position 0 (top-left), with category buttons shifting to positions 1+. The system back remains at position 14.
result: pending

### 15. emoji-emoji-button is the renamed per-emoji entry type
expected: Per-emoji entry buttons in subdeck grids use type `emoji-emoji-button` (not the old `emoji-entry-button`). Tapping a subdeck emoji button still types the emoji via the per-OS shim.
result: pending

## Summary
total: 15
passed: 0
issues: 0
pending: 15
skipped: 0

## Gaps
[none yet]
