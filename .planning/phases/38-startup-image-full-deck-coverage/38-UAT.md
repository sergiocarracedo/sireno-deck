---
status: testing
phase: 38-startup-image-full-deck-coverage
source:
  - .planning/phases/38-startup-image-full-deck-coverage/38-01-SUMMARY.md
started: 2026-06-04T00:00:00Z
updated: 2026-06-04T00:00:00Z
---

## Current Test
number: 3
name: deck-wide-logo-treatment
expected: |
  The logo spans across multiple keys as one continuous image — different keys show different portions of the logo, not identical repeated tiles.

  This was already the behavior and should be preserved.

## Tests

### 1. Verify warm beige startup background
expected: |
  When the Stream Deck boots (or the emulator starts), the startup image shows a warm beige background (`#efe3e1`) instead of the previous dark navy (`#0f1720`).

  To test on emulator:
    pnpm cli:dev emulate

  You should see a beige/warm background with the logo filling the surface.
result: skipped
reason: "The startup placeholder is hardware-only — it writes directly to the physical device. The emulator renders browser-based content immediately and does not display the startup placeholder."

### 2. Verify logo fills full canvas
expected: |
  The logo no longer appears as a small centered element (88%×36%). Instead, it scales to fill the canvas on one axis while preserving aspect ratio. On devices whose aspect ratio differs from the logo (~1.625:1), you'll see letterboxing on one axis.

  Try with different device sizes in emulator to see uniform behavior.
result: pass

### 3. Verify deck-wide logo treatment
expected: |
  The logo spans across multiple keys as one continuous image — different keys show different portions of the logo, not identical repeated tiles.

  This was already the behavior and should be preserved.
result: pass

## Summary

total: 3
passed: 2
issues: 0
pending: 0
skipped: 1

## Gaps

[none — test 1 skipped as hardware-only behavior]