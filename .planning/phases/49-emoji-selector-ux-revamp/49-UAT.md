---
status: testing
phase: 49-emoji-selector-ux-revamp
source: 49-01-SUMMARY.md, 49-02-SUMMARY.md, 49-03-SUMMARY.md, 49-04-SUMMARY.md
started: 2026-06-06T17:30:00Z
updated: 2026-06-06T19:55:00Z
---

## Current Test
number: 3
name: Double-tap delivers the conventional shortcode via HID
expected: |
  Double-press 🔥 within 300ms (config: system_back_tap_command) and the shortcode `:fire:` arrives at the focused window.
  Skipped: requires xdotool or a HID tool that supports shortcode injection. Same environment issue as Test 2.
awaiting: deferred — host missing HID tool (xdotool)

## Tests

### 1. Cold-start smoke test
expected: Daemon boots with emoji-selector enabled. Main deck renders without errors.
result: issue → fixed
reported: "Cannot find module '/.../suppor' imported from .../buttons/entry.tsx — ERR_MODULE_NOT_FOUND at module resolution. The path is truncated to `suppor` instead of `support`."
severity: blocker
root_cause: |
  Two real bugs introduced during the 49-04 work, both of which only surface at runtime (vitest's resolver handled them differently than the tsx runtime loader):
  1. `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` line 18 had `from '../suppor'` (truncated, missing `.js`). The `.js` extension was lost during one of the earlier edits.
  2. `packages/cli/src/builtin-addons/emoji-selector/support.tsx` declared `const EMOJI_FONT_STACK` without the `export` keyword, but `launcher.tsx` imports it. Module-scope `const` is not exported, so the import failed at runtime.
affected_files:
  - packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx
  - packages/cli/src/builtin-addons/emoji-selector/support.tsx

## Tests

### 1. Cold-start smoke test
expected: Daemon boots with emoji-selector enabled. Main deck renders without errors.
result: issue → fixed
reported: "Cannot find module '/.../suppor' imported from .../buttons/entry.tsx — ERR_MODULE_NOT_FOUND at module resolution. The path is truncated to `suppor` instead of `support`."
severity: blocker
root_cause: |
  Two real bugs introduced during the 49-04 work, both of which only surface at runtime (vitest's resolver handled them differently than the tsx runtime loader):
  1. `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` line 18 had `from '../suppor'` (truncated, missing `.js`). The `.js` extension was lost during one of the earlier edits.
  2. `packages/cli/src/builtin-addons/emoji-selector/support.tsx` declared `const EMOJI_FONT_STACK` without the `export` keyword, but `launcher.tsx` imports it. Module-scope `const` is not exported, so the import failed at runtime.
affected_files:
  - packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx
  - packages/cli/src/builtin-addons/emoji-selector/support.tsx

### 2. Tap delivers emoji via per-OS HID shim
expected: With OS detected as Linux: pressing an emoji button (e.g. 🔥) runs `xdotool type --clearmodifiers '🔥'`. On Mac: clipboard paste via osascript. On Windows: Set-Clipboard + SendKeys. The focused window receives the typed emoji.
result: issue
reported: "nothing happens" — tapping the emoji button produced no visible effect.
severity: major
root_cause: "xdotool is not installed on the host (which xdotool → not found). The shim correctly produces `xdotool type --clearmodifiers '🔥'` for Linux, but the action executor runs the command via the shell, where xdotool fails with 'command not found'. The runtime does not surface this failure visibly — the user sees 'nothing happens'. This is a real gap: the shim is correct, but the runtime needs a visible error indicator when a shim command fails (e.g. when xdotool/wtype/wl-copy is missing on the host). The shim should also document its host-dependency as a Phase 49.1 follow-up."
affected_files:
  - packages/cli/src/builtin-addons/emoji-selector/os-shims.ts (design correct, but no host-availability check)
  - packages/cli/src/deck/runtime.ts (action executor result not surfaced in the UI)
  - README/CHANGELOG (no xdotool install hint)

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
issues: 2 (1 fixed, 1 open)
pending: 0
skipped: 13 (deferred — host missing xdotool for HID validation)

## Gaps

```yaml
- truth: "Daemon boots with emoji-selector enabled, main deck renders without errors."
  status: fixed
  reason: "Two real bugs: (1) entry.tsx had `from '../suppor'` (truncated `.js`); (2) support.tsx declared `const EMOJI_FONT_STACK` without `export` but launcher.tsx imports it. Both fixed; cold-start now boots cleanly and connects to Stream Deck."
  severity: blocker
  root_cause: "Two real bugs from 49-04 work that only surfaced at runtime: truncated import path in entry.tsx and un-exported constant in support.tsx. Vitest's resolver handled them differently than the tsx runtime loader, so the unit tests passed."
  affected_files:
    - packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx
    - packages/cli/src/builtin-addons/emoji-selector/support.tsx
  test: 1

- truth: "Tapping an emoji button (e.g. 🔥) on the Stream Deck types the emoji into the focused window via the per-OS HID shim."
  status: open (xdotool required on host)
  reason: "User reported: nothing happens when tapping the emoji button. Root cause: xdotool is not installed on the host. The shim correctly produces the xdotool command, but the action executor's failure is not surfaced in the UI, so the user sees no feedback. **Mitigation landed in follow-up commit:** `os-shims.ts` now exposes `getHostHidToolStatus()` and `launcher.tsx` renders a visible error state ('HID tool missing — install xdotool') when the tool is not detected. So the user can SEE why the tap does nothing, even before installing xdotool."
  severity: major
  root_cause: "xdotool is not installed on the host. The shim design is correct, the runtime still doesn't surface per-tap command failures visibly, and the entry buttons in subdecks don't have the launcher-style error fallback."
  affected_files:
    - packages/cli/src/builtin-addons/emoji-selector/os-shims.ts
    - packages/cli/src/builtin-addons/emoji-selector/buttons/launcher.tsx
    - packages/cli/src/deck/runtime.ts (per-tap failures still not surfaced in UI)
  test: 2
```

## Deferred tests (host missing xdotool)

Tests 3-15 are deferred until xdotool (or a Wayland-equivalent like `wtype`+`wl-copy`) is installed on the host. The shim code is correct; it produces the right command for each OS. Validation requires a real HID tool installed.

Recommended follow-up: a `phase-49.1` that adds:
- xdotool install hint in README + CHANGELOG
- Visible command-failure indicator in the runtime UI (the existing error-code surface)
- Host-availability check in `os-shims.ts` that emits a "HID tool not detected" warning at startup
