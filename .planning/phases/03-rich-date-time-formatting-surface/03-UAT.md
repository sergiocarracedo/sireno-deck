---
status: ready
phase: 03-rich-date-time-formatting-surface
source:
  - .planning/phases/03-rich-date-time-formatting-surface/03-01-PLAN.md
  - .planning/phases/03-rich-date-time-formatting-surface/03-02-PLAN.md
started: 2026-05-29T17:55:00+02:00
updated: 2026-05-29T17:55:00+02:00
---

# Phase 3 UAT — Rich Date-Time Formatting Surface

## Current Test

```yaml
number: 1
name: Browser Date-Time Rich Markup Review
status: ready
awaiting: user run
```

## Tests

### Test 1: Browser Date-Time Rich Markup Review
**Status:** READY

From `packages/cli`, run:

```bash
pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-22/config.emulator-demo.yml --port 0
```

Expected behavior:
- Main deck key `0` renders the built-in `date-time` button through the real single-field `format` contract.
- The time line shows nested rich markup: accent tone plus larger size on `HH:mm`.
- The second line shows highlighted date text and a blinking danger-toned seconds segment.
- Blink is intentionally always-on in this phase; do not treat lack of reduced-motion suppression as a bug in this UAT.
- Navigate to `Fallback` and confirm invalid markup renders literally rather than partially parsing; the output should still include expanded time/date values, but the broken tags should remain visible as text.

**Result:** PENDING

## Summary

```yaml
total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
```

## Gaps

none yet
