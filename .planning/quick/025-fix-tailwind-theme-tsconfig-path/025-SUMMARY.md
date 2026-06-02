# Quick Task 025 Summary

**Task:** Fix this error you added: `ConfigValidationError: Failed to import theme runtime: Cannot resolve tsconfig at path: /works/opensource/sireno-deck/packages/cli/src/tsconfig.json` from `pnpm run cli:dev emulate --port 8912`
**Completed:** 2026-06-02

## What was done
Fixed the Tailwind prebuild theme-resolution seam that was blocking the real workspace-root `cli:dev` command before emulator startup. The immediate bad tsconfig path in `importThemeRuntime(...)` was already real, but fixing it exposed a second live-contract mismatch: the split theme loader had moved manifests to nested `colorTokens`, while runtime code, fixtures, and tests still partly assumed flat theme fields.

## Files changed
- `packages/cli/src/config/theme/theme.ts`: kept the real package tsconfig path and restored runtime compatibility by deriving flat theme color fields from `manifest.colorTokens`.
- `packages/cli/src/config/theme/schemas.ts`: made the split `Theme` interface explicit about the flat color fields the runtime still consumes.
- `packages/cli/src/config/theme/theme.test.ts`: fixed the committed Phase 25 fixture root path and updated temporary theme manifests/assertions to the live `colorTokens` contract.
- `packages/cli/fixtures/phase-25/custom-tsx-theme/manifest.yml`: moved the fixture onto nested `colorTokens`.
- `packages/cli/fixtures/phase-25/out-of-root-theme/manifest.yml`: moved the out-of-root fixture onto nested `colorTokens` so it still fails for the intended import-boundary reason instead of stale manifest drift.

## Commit
`c9a0158`
