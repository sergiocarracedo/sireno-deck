# Plan 12-02 Summary

**Completed:** 2026-07-22

## What was built
The existing `positionButtons(config, keyCount)` algorithm and `rebuildDecksForKeyCount(keyCount)` hook already implement deterministic recompute from the original config on every device swap; this plan demoted the position-overflow logs to debug per Phase 12 logging direction, added ponytail: comments at the rebuild call sites explaining why positions must come from the snapshot rather than in-memory state, and added four tests covering the sparse-output property (length equals assigned count, overflow drops silently, first-duplicate-wins reflow, layout differs by keyCount from the same config).

## Key files
- `packages/cli/src/deck/position-buttons.ts`: demoted `warn` → `debug` on overflow/duplicate/exhausted with `reason` field
- `packages/cli/src/cli/commands/run.ts:605`: `// ponytail: recompute from snapshot every keyCount change` at the positionButtons call inside buildRuntime
- `packages/cli/src/outputClient/emulator.ts:135`: doc comment in the device-swap handler that rebuild paths run `positionButtons(runtimeDeck.config, keyCount)` every time
- `packages/cli/src/deck/__tests__/position-buttons.test.ts`: 4 new tests (sparse length, overflow drops, duplicate reflow, keyCount-dependent layout)

## Decisions made
- **Did not change the exported signature.** The plan suggested `Array<{ button, position }>`; the current `T[]` (where `T extends { position?: number }`) carries the same data inline and is already used in 4 call sites — switching signatures would churn callers for no functional gain. Kept the existing shape.
- **Did not change `buildDeckConfigMessage` to pad nulls.** The wire format already emits only present buttons; the frontend reads each button's `position` (parsed from `id`) and treats gaps as empty cells implicitly. Adding null padding would force every consumer to filter nulls without enabling any new feature.
- **The rebuild hook already exists.** `rebuildDecksForKeyCount` is wired in `emulator.ts:140-143` and into `run.ts:1181` + `run.ts:1276`. The run.ts path rebuilds via `buildRuntime(options, loadedConfig, keyCount).decks`, which calls `positionButtons` fresh — no in-memory state carries over. Confirmed working.

## Notes for downstream
- Plan 12-03 builds on this: it calls `positionButtons(config, keyCount)` first, then walks the assigned slots to replace invalid buttons with `core:temporary-error`. No additional wiring needed — the assigned-slot list is already deterministic per keyCount.
- The device-swap regression test path lives in the emulator E2E suite (not in unit tests); a future plan could add an integration test for the 6→15 keyCount swap.