---
status: testing
phase: 23-jsx-tsx-addon-buttons-startup-image
source:
  - 23-01-SUMMARY.md
  - 23-02-SUMMARY.md
started: 2026-05-25T20:17:37+02:00
updated: 2026-05-25T23:36:39+02:00
---

## Current Test
number: 2
name: Diagnose rerun blocker
expected: |
  Diagnose the new rerun blocker before continuing manual verification.
awaiting: none

## Tests

### 1. Local Raw TSX Addon Startup Test
expected: Start Sireno with a config that points at `packages/cli/fixtures/phase-23/local-raw-addon/` as a local addon. The process should load successfully without a prebuild step, without any `./jsx` import surface, and the raw addon should register/render through the normal startup path.
result: issue
reported: "i used tsx in rthe local-raw-addon and i get the same error: pnpm exec tsx packages/cli/src/cli/index.ts start --config packages/cli/fixtures/phase-23/config.yml ReferenceError: React is not defined at Object.render (/works/opensource/sireno-deck/packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx:15:13) at renderRuntimeButton (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:286:31) at <anonymous> (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:325:56) at Array.map (<anonymous>) at renderDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:325:40) at activateDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:404:11)"
severity: blocker

### 2. Hardware Startup Placeholder Handoff Test
expected: Start Sireno on physical Stream Deck hardware with browser startup intentionally slowed enough to observe boot. A branded `SIRENO / STARTING` placeholder should appear immediately on the hardware, then disappear as soon as the first real browser-backed deck render arrives.
result: pass

### 3. Hardware Startup Failure Cleanup Test
expected: Trigger a browser-start or first-render failure during physical-device startup. The temporary startup placeholder should clear from the hardware instead of remaining as a fake-ready screen, and the underlying startup failure should still surface honestly.
result: pass

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Start Sireno with the corrected shipped config at `packages/cli/fixtures/phase-23/config.yml`. Startup should succeed without a prebuild step, without any `./jsx` import surface, and the raw addon should register/render through the normal startup path."
  status: failed
  reason: "User reported: i used tsx in rthe local-raw-addon and i get the same error: pnpm exec tsx packages/cli/src/cli/index.ts start --config packages/cli/fixtures/phase-23/config.yml ReferenceError: React is not defined at Object.render (/works/opensource/sireno-deck/packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx:15:13) at renderRuntimeButton (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:286:31) at <anonymous> (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:325:56) at Array.map (<anonymous>) at renderDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:325:40) at activateDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:404:11)"
  root_cause: "The shipped raw addon fixture drifted away from the Phase 23 render contract. `packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx` now returns raw JSX (`<span>🍕</span>`) from `render()` without importing React or using the root-export helper path, so runtime rendering throws `ReferenceError: React is not defined`. The adjacent helper-based file `packages/cli/fixtures/phase-23/local-raw-addon/src/content.tsx` still shows the intended contract (`createBaseShapeTextContent` from `sireno-deck-cli`), which means the shipped fixture entrypoint no longer matches the authoring model Phase 23 was supposed to prove. Existing automated tests cover registry/config loading, but they do not yet assert that the shipped fixture's `render()` output itself stays on the helper-based render contract." 
  affected_files:
    - packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx
    - packages/cli/fixtures/phase-23/local-raw-addon/src/content.tsx
    - packages/cli/src/cli/commands/start.test.ts
  rerun_plan: ".planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-04-PLAN.md"
  rerun_status: "Gap closure is in progress through 23-04-PLAN.md. Keep this rerun failure authoritative and rerun the first manual Phase 23 check against the restored helper-based fixture entrypoint after that plan lands."
  severity: blocker
  test: 1
