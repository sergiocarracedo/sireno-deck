---
status: complete
phase: 49-emoji-selector-ux-revamp
source: 49-01..49-07 SUMMARY.md
started: 2026-06-07T11:00:00Z
updated: 2026-06-07T12:15:00Z
---

## Current Test
number: 11
name: system_back_hold_command override (49-03)
expected: |
  With `system_back_hold_command: "<command>"` set, holding the
  system back ≥600ms runs that command via the action executor,
  NOT the default restoreStack.
awaiting: user response

## Tests

### 1. Daemon boots; main deck shows launcher + categories + system back (49-04)
expected: Main deck renders the launcher at top-left, the 11 flat categories behind it, and the system back tile at the bottom-right. No config errors.
result: pass

### 2. Launcher is a 2×3 grid of real emoji glyphs (49-02 + 49-04)
expected: The launcher shows 😂 🔥 ❤️ ⭐ 🍕 🎵 as actual color glyphs (not "U+1F600" text or "?" placeholders). Tapping the launcher does nothing (display-only).
result: pass

### 3. Tapping a category opens a paginated deck (49-01 + 49-03)
expected: Tap a category with > EMOJI_PAGE_SIZE emojis (e.g. smileys, 48 emojis → 4 pages). The next deck shows the first page of emojis with a page-nav tile in the bottom-right.
result: pass

### 4. Page nav: tap = next, dbl-tap = prev (49-03)
expected: On a paginated deck, tapping the page-nav tile advances to the next page. Double-tapping within the 300ms window goes back a page. Already on page 1, dbl-tap is a no-op.
result: pass

### 5. System back from a paginated sub-deck returns to main (49-06 + 49-07)
expected: Walk main → cat-p1 → cat-p2 → … → cat-p5 (all via page-nav taps, which use `addToHistory: false`). Tap system back. Lands on main, NOT on a sub-deck page. Stack is `[main]` after the back.
result: pass

### 6. Page-nav corner chips use the Chip component (49-07)
expected: The "Tap" / "Dbl Tap" labels on the page-nav tile render as `Chip` components, visually consistent with the deck's other navigation chips (not raw `text-[10px] opacity-70` divs).
result: pass

### 7. Tap delivers emoji to focused window (49-01 + 49-05)
expected: With a text input focused, tap an emoji button on the deck. The emoji appears in the input. Mechanism: clipboardy write → simulate-paste keystroke. Requires host clipboard tool (pbcopy / xclip / wl-copy / clip.exe).
result: issue
reported: "wl-clipboard installed as clipboardy recommends for Linux Wayland, but nothing happens"
severity: major
root_cause: "[under investigation — likely wl-copy present but simulatePaste keystroke not reaching focused Wayland window]"
affected_files: ["packages/cli/src/util/clipboard.ts", "packages/cli/src/device/os-shims.ts"]

### 8. Dbl-tap delivers shortcode (49-01 + 49-05)
expected: Double-tap an emoji whose catalog entry has a shortcode (e.g. 🔥 → :fire:). The shortcode appears in the focused input. Same host prereq as test 7.
result: issue
reported: "same issue as before"
severity: major
root_cause: "[same root cause as test 7 — clipboardy+simulatePaste not reaching Wayland focused window]"
affected_files: ["packages/cli/src/util/clipboard.ts", "packages/cli/src/device/os-shims.ts"]

### 9. select_command override (49-01)
expected: A button configured with `select_command: "echo {{emoji}}"` runs that command via the action executor (with template substitution) on tap, instead of the paste path.
result: pass

### 10. system_back_tap_command override (49-03)
expected: With `system_back_tap_command: "<command>"` set on a deck, tapping the bottom-right system back runs that command via the action executor, NOT the default goBack.
result: pass

### 11. system_back_hold_command override (49-03)
expected: With `system_back_hold_command: "<command>"` set, holding the system back ≥600ms runs that command via the action executor, NOT the default restoreStack.
result: pass

## Summary
total: 11
passed: 9
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Tap delivers emoji to focused window (49-01 + 49-05)"
  status: failed
  reason: "wl-clipboard installed but nothing happens on tap"
  severity: major
  root_cause: "[under investigation — likely wl-copy present but simulatePaste keystroke not reaching focused Wayland window]"
  affected_files: ["packages/cli/src/util/clipboard.ts", "packages/cli/src/device/os-shims.ts"]
  test: 7

- truth: "Dbl-tap delivers shortcode (49-01 + 49-05)"
  status: failed
  reason: "same issue as before"
  severity: major
  root_cause: "[same root cause as test 7 — clipboardy+simulatePaste not reaching Wayland focused window]"
  affected_files: ["packages/cli/src/util/clipboard.ts", "packages/cli/src/device/os-shims.ts"]
  test: 8

## Prerequisites

- **All tests:** daemon running with emoji-selector enabled, a connected (or emulated) Stream Deck.
- **Tests 7, 8:** host clipboard tool installed (`pbcopy` / `xclip` / `wl-copy` / `clip.exe`) + a focused text-input target window.
- **Tests 9, 10, 11:** a deck (or example config) that uses `select_command`, `system_back_tap_command`, or `system_back_hold_command`. None ship as defaults; you have to wire them into a config to verify.
