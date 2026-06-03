# Plan 29-01 Summary

**Completed:** 2026-05-28

## What was built
Phase 29's first slice hard-cut the public button contract to the mounted `render(props)` seam and deleted the old public legacy types from `addon/api.ts`. Runtime now owns the only remaining bridge logic internally: it executes mounted definitions directly, preserves `ButtonSurface` metadata truthfully, and keeps runtime-owned press/release/tap, polling, and fallback behavior on the Node side instead of re-exposing `createInstance(...)`.

## Key files
- `packages/cli/src/addon/api.ts`: removed `LegacyAddonButtonDefinition`, `AddonButtonInstance`, and the public mounted-to-instance adapter; made `defineMountedButton(...)` an identity helper and kept `ButtonSurface` as an explicit TSX metadata wrapper.
- `packages/cli/src/index.ts`: exports the truthful mounted button contract types from the public root.
- `packages/cli/src/deck/runtime.ts`: moved the old adapter behavior into runtime-local mounted helpers and stopped calling `definition.createInstance(...)`.
- `packages/cli/src/deck/runtime.test.ts`: rewrote runtime proofs onto mounted definitions and preserved the real runtime semantics.
- `packages/cli/src/render/dom-host.test.tsx`: rewrote the store/metadata proof to call mounted definitions directly.
- `packages/cli/src/addon/loader.test.ts`: updated raw addon fixture coverage to the mounted contract wording and shape.
- `packages/cli/src/cli/commands/start.test.ts`: removed the stale instance-era test seam from startup and emulator proofs.

## Decisions made
- Kept `ButtonSurface` as the honest runtime metadata carrier instead of trying to hide those attributes behind a Fragment-like abstraction.
- Moved the old pressed/frame-state/store adaptation into `deck/runtime.ts` so the public contract stays clean while Node still owns runtime semantics.
- Extended two expensive mounted-path tests with explicit `10_000` ms timeouts after they passed in isolation but timed out in the combined focused verify run.

## Deviations
- `packages/cli/src/config/loader.test.ts` also needed a small truthfulness cleanup from `createInstance()` to direct `render()` even though it was not listed in the plan file's task block. The public contract cut made that stale inline definition misleading and type-hostile, so it was corrected as part of the same mounted-only seam cleanup.

## Notes for downstream
- Runtime still keeps a small internal mounted bridge because Node remains the owner of hardware semantics, polling, and transient render state. That is intentional and should not be mistaken for the deleted public `createInstance(...)` seam.
- The expensive Phase 24 mounted-path proofs now pass, but they remain among the slower focused tests in this area.
