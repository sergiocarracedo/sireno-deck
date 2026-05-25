# Plan 23-04 Summary

**Completed:** 2026-05-25

## What was built
Closed the rerun blocker where the shipped local raw `.tsx` addon fixture had drifted back to raw JSX and failed at runtime with `React is not defined`. Restored the fixture entrypoint to the helper-based root-export contract by routing `render()` back through the existing `createPhase23Label()` helper, then added focused runtime-level regression coverage that proves the shipped Phase 23 sample config reaches real renderable button output through the normal startup/runtime path instead of stopping at registry/config loading.

## Key files
- `packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx`: restored the fixture entrypoint to the helper-based render path instead of raw JSX.
- `packages/cli/fixtures/phase-23/local-raw-addon/src/content.tsx`: remained the canonical helper-based content path used by the fixture entrypoint.
- `packages/cli/src/cli/commands/start.test.ts`: added runtime-level regression coverage proving the shipped Phase 23 sample config renders through the real runtime without ambient React JSX failures.
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-UAT.md`: preserved the rerun failure evidence and pointed the next rerun path at `23-04-PLAN.md`.
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-VERIFICATION.md`: recorded the render-contract drift follow-up and the new rerun path.

## Decisions made
- Fixed the shipped fixture entrypoint rather than widening loader/runtime behavior; the failure was fixture drift, not a platform contract gap.
- Added one runtime-level regression at the existing `loadRuntimeConfig()` + `createDeckRuntime()` seam so the shipped fixture cannot regress back to raw JSX while still passing registry/config-only tests.
- Preserved the rerun UAT failure as authoritative historical evidence instead of rewriting the UAT file to look clean.

## Notes for downstream
- Rerun the first manual Phase 23 UAT check against `packages/cli/fixtures/phase-23/config.yml` now that both the config-to-registry seam and the fixture render contract are corrected.
- The focused Phase 23 automated verification baseline after this closure is `PASS (28) FAIL (0)`.
