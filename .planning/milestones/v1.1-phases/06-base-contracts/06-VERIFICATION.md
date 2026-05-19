# Phase 6 Verification

**Phase:** 6 — Base Contracts
**Date:** 2026-05-14
**Status:** passed

## Verified Must-Haves

### Plan 06-01
- `packages/cli` exposes a dedicated JSX entrypoint through `./jsx` in `packages/cli/package.json`.
- `packages/cli/src/render/jsx.d.ts` declares `deck-button`, `deck-text`, and `deck-surface` against the shared render prop types.
- `packages/cli/fixtures/phase-6/tsconfig.jsx-opt-in.json` plus `jsx-addon-explicit-opt-in.tsx` typecheck successfully only when the JSX declaration is explicitly included.
- `packages/cli/src/render/reconciler.test.tsx` passes and confirms helper-authored and JSX-authored render output match.

### Plan 06-02
- `packages/cli/src/core/schemas.ts` rejects `interval_ms` below `500ms`.
- `packages/cli/src/deck/runtime.ts` prefers `button.interval_ms` over `definition.defaultIntervalMs` and skips polling when neither exists.
- `packages/cli/src/deck/runtime.test.ts` passes with coverage for override, default-only, and no-polling cases.
- `builtin-addons/date-time/src/index.ts` declares `defaultIntervalMs = 1000` and formats labels via `Intl.DateTimeFormat`.
- `builtin-addons/date-time/src/index.test.ts` passes and confirms the bundled date-time addon contract.

## Commands Run

```bash
pnpm --filter sireno-deck-cli exec tsc -p fixtures/phase-6/tsconfig.jsx-opt-in.json --noEmit
pnpm exec vitest run src/render/reconciler.test.tsx src/deck/runtime.test.ts ../../builtin-addons/date-time/src/index.test.ts
```

## Requirement Coverage

- `UIW-01` verified
- `UIW-02` verified
- `UIW-04` verified
- `UIW-05` verified
- `UIW-06` verified

## Notes

- Verification passed without requiring human-only checks.
- The package test harness was expanded to include bundled addon tests so shipped built-ins can be verified through the same phase workflow.
