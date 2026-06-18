# Phase 74 Verification

**Status:** passed
**Date:** 2026-06-18

## Must-haves verified

| Must-have | Status | Evidence |
|-----------|--------|----------|
| system-status-label-values schema rejects 3+ metrics with the value-display hint | ✅ | `schemas.ts:51-57` uses `z.array(LabelValueMetricSchema).min(1).max(2, "system-status-label-values supports 1–2 metrics; for 3+ values use the value-display addon (FEAT-02)")` |
| system-status-label-values schema still accepts 1 and 2 metric configs | ✅ | `min(1)` allows 1; `max(2)` allows 2 |
| system-status-bars schema is unchanged (still allows 1-3 metrics) | ✅ | `schemas.ts:35-46` retains `z.union([z.tuple([1...]), z.tuple([2...]), z.tuple([3...])])` for `SystemStatusBarsButtonSchema.metrics` |
| Existing tests pass with 2 metrics; new test asserts 3+ rejection | ✅ | `index.test.ts:122-138` new test asserts `safeParse({ metrics: [3 items] }).success === false` and error contains 'value-display'. `pnpm vitest run src/builtin-addons/system-status/` → 7/7 pass. |
| ROADMAP.md Phase 74 success criteria updated to drop Bars-related items | ✅ | `ROADMAP.md:68-83` shows new criteria: 4 items, no Bars-related ones. BUG-07 marked deferred. Status: ✓ Executed (2026-06-18). |
| REQUIREMENTS.md BUG-07 entry noted as out-of-scope for v1.7 | ✅ | `REQUIREMENTS.md` BUG-07 row carries `**Deferred for v1.7** — see .planning/phases/74-shared-formatter-label-values-cap/74-DISCUSSION-LOG.md` |

## Tests

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

**No regressions.** 6 existing system-status tests + 1 new 3+ rejection test. All pass.

**No new typecheck errors.** Pre-existing errors in `bars.tsx` and other unrelated files are unchanged (verified via `git stash`).
