---
status: complete
phase: 30-content-helpers-system-status-and-media
source:
  - .planning/phases/30-content-helpers-system-status-and-media/30-01-SUMMARY.md
  - .planning/phases/30-content-helpers-system-status-and-media/30-02-SUMMARY.md
  - .planning/phases/30-content-helpers-system-status-and-media/30-03-SUMMARY.md
started: 2026-05-30T23:03:44+02:00
updated: 2026-05-30T23:03:44+02:00
---

## Current Test
number: 3
name: Media-Player Degrades Honestly Or Shows Live Playback Status Through The Shared Surface
expected: |
  With the same emulator session, inspect button 3 (top-right).

  If a Linux MPRIS-compatible player is active, expected: the button shows a media status
  glyph/state, title and artist text, app/source name, and a single shared progress bar;
  long title/artist text should scroll using marquee behavior rather than clipping into
  broken layout.

  If no supported player is active, or if you are on macOS/Windows where the adapter is
  intentionally unsupported, expected: the button degrades honestly with `Unavailable` /
  `No active player`-style messaging and an offline/unsupported state instead of fabricated
  metadata or crashes.
awaiting: complete

## Tests

### 1. System-Status Bars Render Canonical Metrics Without Hiding Unavailable Slots
expected: Kill any running Sireno emulator or daemon first. From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config /tmp/opencode/phase-30-uat-config.yml --port 0`. Open the printed emulator URL and inspect button 1 (top-left). Expected: the button renders the new shared bar-style system-status surface with three metric slots labeled `CPU`, `RAM`, and `Swap`. The UI should visibly use a bar layout, and if swap is unavailable on this host it must still keep the third slot visible with an explicit fallback such as `N/A` instead of disappearing or crashing the whole button.
result: pass

### 2. System-Status Label/Value Layout Auto-Selects And Keeps Unavailable Rows Visible
expected: With the same emulator session still running from `/tmp/opencode/phase-30-uat-config.yml`, inspect button 2 (top-middle). Expected: the button renders the label/value helper surface in its 3-line stacked layout, showing rows for `CPU`, `Fan`, and `Uptime`. Each row should stay visible even when a metric is unavailable; if fan speed is unavailable on this machine, the `Fan` row should still render with an explicit fallback such as `N/A` instead of collapsing out of the layout.
result: pass

### 3. Media-Player Degrades Honestly Or Shows Live Playback Status Through The Shared Surface
expected: With the same emulator session, inspect button 3 (top-right). If a Linux MPRIS-compatible player is active, expected: the button shows a media status glyph/state, title and artist text, app/source name, and a single shared progress bar; long title/artist text should scroll using marquee behavior rather than clipping into broken layout. If no supported player is active, or if you are on macOS/Windows where the adapter is intentionally unsupported, expected: the button degrades honestly with `Unavailable`/`No active player`-style messaging and an offline/unsupported state instead of fabricated metadata or crashes.
result: pass

## Summary

total: 3
passed: 2
passed: 3
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
