# Plan 14-04 Summary

**Completed:** 2026-05-19

## What was built
Closed the Phase 14 UAT gap where the real `get-set` review fixture could stay visually stuck in the pending state. The runtime now rebuilds the final deck-surface payload from the latest `renderCache` entries after per-button renders settle, so a stale startup deck render can no longer overwrite a newer authoritative button render on the real device path.

## Key files
- `packages/cli/src/deck/runtime.ts`: rebuilds deck-surface output from the latest cached button descriptions after per-button rendering completes.
- `packages/cli/src/deck/runtime.test.ts`: reproduces the startup write-order race and proves the settled `OFF` render wins over the stale pending snapshot.
- `.planning/phases/14-richer-built-in-toggles/14-UAT.md`: records the diagnosed root cause and notes that Test 2 should be rerun on the real fixture path.

## Decisions made
- Fixed the race at the runtime deck-surface aggregation layer instead of teaching the toggle addon to manage render ordering itself.

## Deviations
- None.

## Notes for downstream
- Phase 14 should return to `verify-work 14` and rerun Test 2 on `config.toggle-get-set.yml` to confirm the real CLI/device surface now settles from pending to `OFF`.
