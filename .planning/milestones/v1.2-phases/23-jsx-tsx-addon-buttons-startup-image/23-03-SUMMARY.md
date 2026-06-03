# Plan 23-03 Summary

**Completed:** 2026-05-25

## What was built
Closed the one remaining Phase 23 UAT blocker by correcting the shipped Phase 23 sample config to use the raw addon's real registered button definition id instead of the addon package name. Added focused `loadRuntimeConfig()` regression coverage that exercises the shipped Phase 23 sample config through the normal startup/config path, including the bundled registry, so config-to-registry drift cannot silently recur. Updated the UAT and verification artifacts to preserve the original failed evidence while pointing rerun work at the gap-closure plan.

## Key files
- `packages/cli/fixtures/phase-23/config.yml`: corrected the shipped sample config to use `phase-23-local-raw-button`.
- `packages/cli/src/cli/commands/start.test.ts`: added regression coverage proving the shipped Phase 23 fixture config loads through the normal startup/config path with the raw addon's real registered button type.
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-UAT.md`: preserved the failed manual UAT evidence and linked rerun work to `23-03-PLAN.md`.
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-VERIFICATION.md`: recorded the UAT-discovered root cause and the gap-closure rerun path.

## Decisions made
- Fixed the shipped sample config rather than widening validation or changing registry semantics; `packages/cli/src/core/schemas.ts` should continue validating button `type` against registered button definition ids.
- Grounded the regression test in the real bundled registry factory so the shipped fixture config stays honest about built-in deck/button types as well as the raw addon seam.
- Preserved the original failed UAT evidence instead of rewriting history, so the gap and its closure path remain auditable.

## Deviations
- The gap-closure plan file `23-03-PLAN.md` was generated during `verify-work` and is being committed now alongside the execution summary so the rerun references in UAT/verification docs resolve to a tracked artifact.

## Notes for downstream
- Rerun the first Phase 23 manual UAT check against `packages/cli/fixtures/phase-23/config.yml` to confirm the corrected shipped fixture now starts successfully.
- The Phase 23 automated verification baseline is now `PASS (27) FAIL (0)`.
