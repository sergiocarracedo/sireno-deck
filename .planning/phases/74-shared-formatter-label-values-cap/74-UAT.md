---
status: complete
phase: 74-shared-formatter-label-values-cap
source:
  - .planning/phases/74-shared-formatter-label-values-cap/74-01-SUMMARY.md
started: 2026-06-18T02:50:00Z
updated: 2026-06-18T02:55:00Z
---

## Current Test

number: 6
name: REQUIREMENTS.md BUG-07 entry marked deferred for v1.7
expected: |
  `.planning/REQUIREMENTS.md` BUG-07 row carries a "**Deferred for v1.7**"
  note pointing to the discussion log.
awaiting: pass

## Tests

### 1. label-values schema cap — 3+ metrics rejected with value-display hint

expected: |
  Source file `packages/cli/src/builtin-addons/system-status/schemas.ts` shows
  `SystemStatusLabelValuesButtonSchema.metrics` using
  `z.array(LabelValueMetricSchema).min(1).max(2, "...")` where the message
  contains the substring "value-display".
result: pass

### 2. label-values schema still accepts 1 and 2 metric configs

expected: |
  The schema uses `.min(1)` and `.max(2)` so 1-metric and 2-metric configs
  are accepted. The existing 2-metric test in
  `packages/cli/src/builtin-addons/system-status/index.test.ts:111-119`
  still passes.
result: pass

### 3. system-status-bars schema is unchanged (still allows 1-3 metrics)

expected: |
  `SystemStatusBarsButtonSchema.metrics` still uses the 3-tuple union
  `z.union([z.tuple([1...]), z.tuple([2...]), z.tuple([3...])])` — Bars
  is intentionally untouched by Phase 74.
result: pass

### 4. New test asserts 3+ rejection with value-display hint

expected: |
  `packages/cli/src/builtin-addons/system-status/index.test.ts` contains a
  new test that parses a 3-metric config via safeParse, asserts
  `success === false`, and verifies the error message contains "value-display".
  Running `pnpm vitest run src/builtin-addons/system-status/` from the cli
  package reports 7/7 tests pass.
result: pass

### 5. ROADMAP.md Phase 74 success criteria updated

expected: |
  `.planning/ROADMAP.md` Phase 74 section shows updated success criteria
  that no longer mention Bars formatter, marks BUG-07 deferred, and shows
  status "✓ Executed (2026-06-18)".
result: pass

### 6. REQUIREMENTS.md BUG-07 entry marked deferred for v1.7

expected: |
  `.planning/REQUIREMENTS.md` BUG-07 row carries a "**Deferred for v1.7**"
  note pointing to the discussion log.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
