---
status: complete
phase: 04-verification-and-contract-cleanup
source:
  - .planning/phases/04-verification-and-contract-cleanup/04-01-SUMMARY.md
  - .planning/phases/04-verification-and-contract-cleanup/04-02-SUMMARY.md
started: 2026-05-29T19:50:00+02:00
updated: 2026-05-30T00:15:55+02:00
---

## Current Test
number: 2
name: Workflow Truth Review
expected: |
  Read these files:

  - `.planning/phases/03-rich-date-time-formatting-surface/03-VERIFICATION.md`
  - `.planning/STATE.md`

  Phase 3 verification should no longer claim `verify-work 3` must be rerun, and the current state should route the project through completed Phase 4 execution toward `verify-work 4` instead of stale Phase 3 rerun/planning language.
awaiting: none

## Tests

### 1. Browser Rich Date-Time Invalid Markup Fallback Review
expected: From `packages/cli`, run `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-22/config.emulator-demo.yml --port 0`. On the main deck, key `0` should still show the rich date-time review path with a visibly larger accented `HH:mm` line, blinking `:`, and smaller date line. Then navigate to `Fallback` and confirm the invalid-markup example renders literally rather than partially parsing while still showing expanded date/time values inside that literal output.
result: pass

### 2. Workflow Truth Review
expected: Read `.planning/phases/03-rich-date-time-formatting-surface/03-VERIFICATION.md` and `.planning/STATE.md`. Phase 3 verification should no longer claim `verify-work 3` must be rerun, and the current state should route the project through completed Phase 4 execution toward `verify-work 4` instead of stale Phase 3 rerun/planning language.
result: pass

## Summary

```yaml
total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
```

## Gaps

none yet
