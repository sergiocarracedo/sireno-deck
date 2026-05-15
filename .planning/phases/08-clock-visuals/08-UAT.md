---
status: ready
phase: 08-clock-visuals
source:
  - 08-01-SUMMARY.md
  - 08-02-SUMMARY.md
started: 2026-05-15T23:57:00+02:00
updated: 2026-05-15T23:57:00+02:00
---

## Current Test
number: 1
name: analog clock review fixture
expected: |
  Run the committed Phase 8 fixture through the real CLI/device path and confirm the analog clock is legible and updates once per second.
awaiting: reviewer run

## Tests

### 1. Analog Clock Legibility And Live Cadence
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-8/config.analog-clock.yml`. Inspect the key at position `0`, which should render the bundled `analog-clock` type from `packages/cli/fixtures/phase-8/config.analog-clock.yml`. The visual should be a pure analog face with no fallback text card, no label, and no subtitle. The hour hand should be the shortest and thickest hand, the minute hand should be longer, and the second hand should remain visible as the thinnest accent-colored hand. Observe the key for at least 5 seconds: the second hand should advance once per second through the core scheduler cadence, while the hour and minute hands remain stable enough to read the current time.
fixture: `packages/cli/fixtures/phase-8/config.analog-clock.yml`
pass_if:
  - The analog clock face is visibly distinct from the default text card and contains no digital text fallback.
  - Hour, minute, and second hands are all legible on the rendered key.
  - The second hand advances at roughly 1 Hz over a 5-second observation window.
fail_if:
  - The key shows a default/shared text card, clipped label text, or any subtitle badge instead of a pure analog clock face.
  - Any hand is missing or too hard to distinguish from the others.
  - The second hand stays frozen, jumps erratically, or updates slower/faster than once per second.
result: pending

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0

## Gaps

none yet
