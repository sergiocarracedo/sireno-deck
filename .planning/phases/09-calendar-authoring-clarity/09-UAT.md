---
status: pending
phase: 09-calendar-authoring-clarity
source:
  - 09-01-SUMMARY.md
started: 2026-05-16T10:15:00+02:00
updated: 2026-05-16T10:15:00+02:00
---

## Current Test
number: 1
name: Calendar Sheet Tear-Sheet Legibility
expected: |
  Run the Phase 9 calendar-sheet review fixture and inspect the bundled tear-sheet visual on the real CLI/device path.
awaiting: reviewer run of fixture

## Tests

### 1. Calendar Sheet Tear-Sheet Legibility And Cadence
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-9/config.calendar-sheet.yml`. Inspect the key at position `0`, which should render the bundled `calendar-sheet` type from `packages/cli/fixtures/phase-9/config.calendar-sheet.yml`. The visual should read as a tear-sheet calendar with one dominant day number, small weekday/month context, and no fallback text card, label, or subtitle shell. Observe the key long enough to confirm the display is stable for a date-level widget and does not flicker or behave like a 1 Hz clock. The underlying default cadence for the button remains `60000ms`, so the review expectation is a calm date-oriented visual rather than per-second movement.
fixture: `packages/cli/fixtures/phase-9/config.calendar-sheet.yml`
pass_if:
  - The calendar reads as a single-key tear-sheet with a large day number and supporting weekday/month context.
  - The key does not fall back to the default/shared text card and does not show a label or subtitle badge.
  - The visual remains stable and date-appropriate instead of behaving like a once-per-second clock.
fail_if:
  - The key shows a default/shared text card, clipped fallback text, or a dense month-grid style layout.
  - The day number is not visually dominant or the weekday/month context is unreadable.
  - The key redraws erratically or implies a faster-than-minute cadence for the shipped contract.
result: pending

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0

## Gaps

none yet
