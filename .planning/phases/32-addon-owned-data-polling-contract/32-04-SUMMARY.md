# Plan 32-04 Summary

**Completed:** 2026-06-01

## What was built
Plan 32-04 closed the big-bang migration by removing core-owned system/media capability modules and proving full regression coverage on the shipped runtime/addon paths. Core `/system/*` now keeps only non-capability host/session seams. The previously known runtime failures in locked-time fallback slot handling and get-set pending tap behavior were fixed, then the full Phase 32 regression gate passed end to end.

## Key files
- `packages/cli/src/system/live-metrics.ts` (deleted): removed core-owned system-status capability domain.
- `packages/cli/src/system/system-status.ts` (deleted): removed core-owned display mapping capability domain.
- `packages/cli/src/system/media-controller.ts` (deleted): removed core-owned media capability domain.
- `packages/cli/src/system/linux-media-controller.ts` (deleted): removed core-owned Linux media adapter.
- `packages/cli/src/system/macos-media-controller.ts` (deleted): removed core-owned macOS media adapter.
- `packages/cli/src/system/windows-media-controller.ts` (deleted): removed core-owned Windows media adapter.
- `packages/cli/src/system/live-metrics.test.ts` (deleted): removed obsolete core capability test.
- `packages/cli/src/system/system-status.test.ts` (deleted): removed obsolete core capability test.
- `packages/cli/src/builtin-addons/date-time/schemas.ts`: adds explicit locked-time split-slot schema support (`hour-tens`, `hour-ones`, `minute-tens`, `minute-ones`).
- `packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile.tsx`: renders split-slot characters correctly for implicit locked fallback layout.
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.tsx`: fixes get-set pending first-tap race via `tappedWhilePending` guard.

## Decisions made
- Kept big-bang cleanup strict: removed capability seams instead of leaving compatibility facades.
- Treated the two runtime failures as real contract regressions and fixed root causes before phase closure.
- Accepted `tsc --noEmit` as non-gating because repo-wide pre-existing type debt still fails broadly outside this phase scope.

## Verification
- `pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/builtin-addons/system-status/index.test.ts src/builtin-addons/media-player/index.test.ts src/addon/loader.test.ts` -> PASS (59/59).
- `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/core-buttons/index.test.ts src/builtin-addons/date-time/index.test.ts` -> PASS (26/26).

## Notes for downstream
- Phase 32 regression gate is now clean; next workflow step is `verify-work 32` for manual UAT before `/review`, `/ship`, and `/compound`.
