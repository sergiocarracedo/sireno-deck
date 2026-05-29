---
status: complete
phase: 02-live-shrink-fit-measurement
source:
  - .planning/phases/02-live-shrink-fit-measurement/02-01-PLAN.md
  - .planning/phases/02-live-shrink-fit-measurement/02-02-PLAN.md
started: 2026-05-28T18:28:40+02:00
updated: 2026-05-29T09:06:20+02:00
---

## Current Test
number: 1
name: Browser Shrink-Fit Review Fixture
expected: |
  From `packages/cli`, run:

  `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-22/config.emulator-demo.yml --port 0`

  Expected on the main deck: key `0` shows a long single-line label that visibly shrinks to fit instead of wrapping.

  Then open the `Emoji` deck.

  Expected there: key `0` reaches the readable floor and then ellipsizes instead of wrapping or pretending mounted/static parity.

  This UAT is browser/emulator only. Mounted/static output should not be judged as if it had live browser measurement.
awaiting: complete

## Tests

### 1. Browser Shrink-Fit Review Fixture
expected: Run `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-22/config.emulator-demo.yml --port 0` from `packages/cli`. Expected: the main-deck review button shrinks a long label onto one line in the browser emulator path, and the `Emoji` deck review button shows readable-floor ellipsis instead of wrap/overflow. This review is browser/emulator-only and should not be interpreted as mounted/static parity.
result: pass

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
