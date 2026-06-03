# Plan 24-02 Summary

**Completed:** 2026-05-26

## What was built
Added the core-owned addon session store seam that Phase 24 promised. Mounted render props now receive `store.button` and `store.addon` scopes as snapshots plus mutators, while runtime owns the actual store lifetime, mutation entrypoints, and rerender triggers. Button-local state stays isolated by default, addon-wide state coordinates intentionally across one addon's buttons, and the whole store resets honestly when the runtime is rebuilt.

This slice also extended the committed Phase 24 fixture to prove coordinated addon state across deck changes, plus a focused render-host test that locks the props-first contract without introducing hook/context magic. The key correctness point is that React renders from runtime-owned snapshots; it does not become the durable persistence layer.

## Key files
- `packages/cli/src/addon/api.ts`: added public store prop types and the mounted-store adapter seam.
- `packages/cli/src/addon/registry.ts`: stamps hidden addon ownership metadata onto registered button definitions.
- `packages/cli/src/deck/runtime.ts`: owns addon/button store maps, mutation-triggered rerenders, and runtime-session-only lifetime.
- `packages/cli/src/deck/runtime.test.ts`: proves button-local isolation, addon-wide coordination, deck-switch persistence, and runtime-reset behavior.
- `packages/cli/src/render/dom-host.test.tsx`: pins the props-first store snapshot contract at the host boundary.
- `packages/cli/fixtures/phase-24/`: extended with shared/observer/navigation proof buttons for real fixture-backed coverage.

## Decisions made
- Recovered addon identity at registry-registration time instead of widening config/schema shapes with addon ownership metadata.
- Kept transient `pressed` / `frameState` out of the durable store; store scope is only for session durability.
- Used one runtime-owned invalidation seam for store mutations so mounted buttons do not need to remember to call `invalidate()` after every store write.

## Notes for downstream
- Inline/direct `createInstance(...)` callers bypass the registry, so tests that need addon-wide scope must stamp owner metadata explicitly.
- The Phase 24 fixture now proves store persistence across ordinary deck changes and reset on rebuilt runtime; mounted-local state is handled separately in Plan 24-03.
