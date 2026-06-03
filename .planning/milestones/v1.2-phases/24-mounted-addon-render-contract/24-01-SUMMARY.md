# Plan 24-01 Summary

**Completed:** 2026-05-26

## What was built
Established the mounted button contract as a real public authoring path without forcing a flag-day break. `packages/cli/src/addon/api.ts` now exposes `defineMountedButton(...)`, mounted render props, and definition-level handlers, while the runtime still executes through one explicit compatibility seam so legacy instance-first definitions continue to boot during the migration.

This slice also shipped the first committed Phase 24 proof addon under `packages/cli/fixtures/phase-24/` and pinned it through loader and runtime coverage. That proof caught a real adapter bug: mounted render-state had to stay synchronized even when a definition only supplied `render` plus `onTap`, so the adapter now updates `pressed` / `frameState` unconditionally rather than only when explicit press/release handlers exist.

## Key files
- `packages/cli/src/addon/api.ts`: added the mounted definition contract, visible compatibility adapter, and mounted render-state handling.
- `packages/cli/src/deck/runtime.ts`: routed runtime execution through the new adapter seam while keeping Node-owned event semantics intact.
- `packages/cli/src/deck/runtime.test.ts`: proved mounted `onPress` / `onRelease` / `onTap` behavior through the real runtime path.
- `packages/cli/src/addon/loader.test.ts`: pinned raw local addon loading for the mounted contract fixture.
- `packages/cli/fixtures/phase-24/`: added the first reviewable mounted-contract addon/config proof.

## Decisions made
- Kept the migration boundary explicit in `api.ts` instead of sprinkling contract detection heuristics across runtime and built-ins.
- Preserved runtime ownership of hardware semantics; React did not become the input/lifecycle owner in this slice.
- Fixed the adapter rather than weakening the proof fixture when the file-backed test exposed stale mounted render-state.

## Notes for downstream
- The mounted contract is real, but at this point it still rode through the legacy runtime seam; later slices own durable store scope and mounted active-deck behavior.
- The committed Phase 24 fixture is the canonical review surface for follow-on store and mounted-host work.
