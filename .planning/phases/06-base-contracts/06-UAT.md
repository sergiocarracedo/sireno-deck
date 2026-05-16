---
status: complete
phase: 06-base-contracts
source:
  - .planning/phases/06-base-contracts/06-01-SUMMARY.md
  - .planning/phases/06-base-contracts/06-02-SUMMARY.md
started: 2026-05-14T18:38:00Z
updated: 2026-05-14T18:43:00Z
---

## Current Test
number: 5
name: Config rejects too-fast interval overrides
expected: |
  Create or edit a config so a button uses `interval_ms: 100` (or any value below `500`) and load it through the CLI config path.

  Expected result:
  - config validation fails instead of silently clamping
  - the failure clearly indicates the interval override is invalid
  - the system does not accept aggressive sub-500ms polling through config
awaiting: user response

## Tests

### 1. Explicit JSX opt-in fixture typechecks
expected: From the repo root, `pnpm --filter sireno-deck-cli exec tsc -p packages/cli/fixtures/phase-6/tsconfig.jsx-opt-in.json --noEmit` exits successfully with no TypeScript errors, proving addon code can opt into `deck-button`, `deck-text`, and `deck-surface` explicitly.
result: pass

### 2. Reconciler keeps helper-authored and JSX-authored render output aligned
expected: From `packages/cli`, `pnpm exec vitest run src/render/reconciler.test.tsx` passes and includes the JSX-authored render case, proving helper-based rendering still behaves the same after adding the JSX typing surface.
result: pass

### 3. Live polling cadence favors config override, then definition default
expected: From `packages/cli`, `pnpm exec vitest run src/deck/runtime.test.ts` passes. The runtime tests cover three observable truths: `interval_ms` override wins, `defaultIntervalMs` is used when no override exists, and buttons with neither cadence do not poll.
result: pass

### 4. Bundled digital date-time button is a live widget contract
expected: From `packages/cli`, `pnpm exec vitest run ../../builtin-addons/date-time/src/index.test.ts` passes. The bundled addon exposes the `date-time` button, declares the default refresh cadence, and renders a deck button label formatted through `Intl.DateTimeFormat`.
result: pass

### 5. Config rejects too-fast interval overrides
expected: If you set a button `interval_ms` below `500` in config, config validation should fail instead of silently clamping. The reported behavior should clearly indicate that the override is invalid rather than allowing aggressive polling.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
