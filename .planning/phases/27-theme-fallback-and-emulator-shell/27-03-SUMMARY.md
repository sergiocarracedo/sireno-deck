# Plan 27-03 Summary

**Completed:** 2026-05-27

## What was built
Closed the UAT blocker Phase 27 originally missed. The exact repo-root raw-source CLI command `pnpm exec tsx packages/cli/src/cli/index.ts ...` now inherits the same JSX policy as the package runtime through a minimal workspace-root `tsconfig.json`, so emulator startup no longer crashes with `ReferenceError: React is not defined` before the shared deck renderer can boot.

This closure slice also replaced the neighboring runtime proof with one on the honest failing seam and kept the failure history inspectable. `packages/cli/src/cli/commands/start.test.ts` now shells the repo-root startup command itself, and the rerun artifacts preserve the original failed UAT evidence while showing that the previously blocked legacy-YAML theme check now reaches the intended explicit rejection path.

## Key files
- `tsconfig.json`: adds the minimal workspace-root TSX policy anchor so repo-root raw-source CLI launches pick up the same JSX/runtime behavior as `packages/cli/tsconfig.json`.
- `packages/cli/src/cli/commands/start.test.ts`: replaces the neighboring package-root runtime proof with a subprocess regression on the exact repo-root `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0` seam.
- `.planning/phases/27-theme-fallback-and-emulator-shell/27-UAT.md`: preserves the original crash evidence, records the repo-root TSX-policy root cause, and records the successful rerun of both the startup seam and the blocked legacy-YAML rejection truth.
- `.planning/phases/27-theme-fallback-and-emulator-shell/27-VERIFICATION.md`: updates Phase 27 verification so it reflects the closure plan and rerun evidence instead of claiming a clean pass before the blocker was closed.

## Decisions made
- Fixed the exact repo-root startup seam instead of adding another runtime-specific workaround inside `dom-host.tsx`.
- Kept the regression anchored to the real long-running emulator command and used a controlled execa timeout as the stop condition, because the product seam is healthy once startup reaches the emulator boundary without the React crash.
- Preserved the failed UAT history and pointed the rerun at `27-03-PLAN.md` instead of rewriting the original blocker out of the artifacts.

## Notes for downstream
- If raw-source CLI commands are part of the supported developer workflow, keep at least one regression on the exact repo-root invocation, not only on package-local runtime imports.
- The remaining timeout-cleanup noise in `startEmulatorSession()` is a separate seam from this Phase 27 blocker. Do not conflate shutdown cleanup errors with startup JSX-policy failures.
