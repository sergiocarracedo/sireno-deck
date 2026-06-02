---
status: testing
phase: 34-button-action-command-interface
source:
  - .planning/phases/34-button-action-command-interface/34-01-SUMMARY.md
  - .planning/phases/34-button-action-command-interface/34-02-SUMMARY.md
  - .planning/phases/34-button-action-command-interface/34-03-SUMMARY.md
started: 2026-06-02T22:09:27+02:00
updated: 2026-06-02T22:09:27+02:00
---

## Current Test
number: 1
name: Action Button Uses Shared Tap Hold Double-Tap Commands
expected: |
  Start an emulator session with a config that includes an `action` button using the new nested `commands` shape. Expected: a normal tap runs only `commands.tap`; a long press runs only `commands.hold`; a quick double tap runs only `commands.double-tap`; and a single tap does not also fire when double tap wins.
awaiting: user response

## Tests

### 1. Action Button Uses Shared Tap Hold Double-Tap Commands
expected: Start an emulator session with a config that includes an `action` button using the new nested `commands` shape. Expected: a normal tap runs only `commands.tap`; a long press runs only `commands.hold`; a quick double tap runs only `commands.double-tap`; and a single tap does not also fire when double tap wins.
result: pending

### 2. System-Status Buttons Still Render Truthfully While Shared Commands Work
expected: In an emulator session with `system-status-bars` or `system-status-label-values` configured with nested `commands`, the metric tiles should still render their normal live or unavailable content. Expected: tap/hold/double-tap command gestures work, but polling, cadence, and explicit unavailable rendering remain intact instead of regressing into blanks, stale tiles, or generic errors.
result: pending

### 3. Regular Date-Time Buttons Accept Shared Commands Without Visual Regression
expected: In an emulator session with regular `date-time`, `time`, `analog-clock` or `clock`, and `calendar-sheet` buttons configured with nested `commands`, those buttons should still look and refresh like normal date-time tiles. Expected: tap/hold/double-tap gestures work on the regular family, and the `clock` alias remains available at the addon seam.
result: pending

### 4. Locked Tiles And Media-Player Stay Outside The Shared Command Rollout
expected: Test one locked time tile and one `media-player` button. Expected: locked time tiles still use their dedicated locked-session behavior and do not expose the shared command gesture contract; `media-player` keeps its existing internal behavior instead of switching to the shared nested `commands` rollout.
result: pending

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0

## Gaps

none yet
