---
status: complete
phase: 22-browser-deck-emulator
source:
  - 22-01-SUMMARY.md
  - 22-02-SUMMARY.md
  - 22-03-SUMMARY.md
started: 2026-05-25T09:52:39+02:00
updated: 2026-05-25T10:17:57+02:00
---

## Current Test
number: 4
name: UAT complete
expected: |
  All Phase 22 manual UAT checks passed.
awaiting: none

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running emulator, start `sireno emulate` with `packages/cli/fixtures/phase-22/config.emulator-demo.yml`, and confirm the browser page boots without hardware and shows the real configured `date-time`, `Ping`, and `Emoji` buttons.
result: pass

### 2. Pressed-State And Real Input Test
expected: Press and hold the `Ping` or `Emoji` button in the browser page. The button should visibly change while held, return to idle on release, and release should still trigger the real runtime behavior instead of a fake preview-only click path.
result: pass

### 3. Device Switch Restart Test
expected: Use the virtual device selector to switch from `Stream Deck MK.2` to `Stream Deck XL`. The emulator should restart cleanly for the new layout and continue serving the active deck without stale pressed state.
result: pass

### 4. Undersized Layout Error Test
expected: Switch to a virtual device layout that is too small for the configured deck. The emulator should show `Emulator Layout Error` clearly instead of clipping hidden keys or auto-switching to another layout.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

None yet.
