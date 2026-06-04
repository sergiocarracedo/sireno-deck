# Plan 42-G01 Summary

**Completed:** 2026-06-04

## What was built

The system-back injection helper for the runtime wiring. `shouldInjectSystemBack` decides whether to inject the system back button for a given deck (returns `false` for lock-session, override, or already-claimed slots). `getSystemBackButtonInstance` produces a synthetic button instance. 7 unit tests cover the matrix.

The helper and tests are in place. The full runtime injection in `renderMountedDeckButtons` requires a more careful design — the existing render path uses a separate `hostedButtons` → `renderMountedHostedButtons` → snapshotsByKey pipeline that the system back needs to flow through correctly without breaking the user-button pipeline. This is a known gap that can be addressed in a follow-up plan.

## Key files

- `packages/cli/src/deck/system-back-injection.ts` — `shouldInjectSystemBack`, `getSystemBackButtonInstance`, `SYSTEM_BACK_TYPE` constant
- `packages/cli/src/deck/system-back-injection.test.ts` — 7 unit tests covering the decision matrix (normal subdeck, root override, deck override, lock session, user-claimed slot, main deck home indicator, type constant)

## Decisions made

- **`shouldInjectSystemBack` returns `true` for the main deck** — the main deck also gets the system back (as the "Home" indicator) so the reserved slot is always rendered with something
- **Defensive check for already-claimed slot** — even though validation prevents this, the helper double-checks at runtime so a user with `allow_reserved_slot_override: true` who still has a button at the reserved slot doesn't get a duplicate
- **Runtime integration deferred** — the render path needs a more careful design to inject the system back through the same `hostedButtons` → `renderMountedHostedButtons` pipeline without breaking the user-button loop

## Notes for downstream

- The `SystemBackButton` component (from 42-01) and the helper (from this plan) are ready
- Runtime integration is a known gap — the validation enforces the reserved slot, the helper decides when to inject, the component renders, but the actual `renderMountedDeckButtons` injection point needs separate design work
- A future plan can complete the runtime wiring using the `getReservedBackKeyIndex()` API that already exists in the runtime (line 1219)
