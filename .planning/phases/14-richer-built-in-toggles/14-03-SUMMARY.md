# Plan 14-03 Summary

**Completed:** 2026-05-19

## What was built
Phase 14 now supports the final `toggle-status` authority model on the same built-in `toggle` type. The bundled button runs a write-only `toggle_command`, then reconciles through a required `status_command` instead of inferring the new truth locally, while keeping the same pending/error lifecycle rules as `get-set`. The repo also now ships the full Phase 14 review surface with committed fixtures and UAT coverage for internal, `get-set`, and `toggle-status` modes.

## Key files
- `packages/cli/src/core/schemas.ts`: adds the strict `mode: "toggle-status"` config branch.
- `packages/cli/src/config/loader.test.ts`: pins valid config, missing `status_command`, wrong-branch fields, and token-list validation for `toggle-status`.
- `builtin-addons/core-buttons/src/index.ts`: implements write-then-reconcile behavior through `status_command` and keeps mode-specific render metadata on the same toggle family.
- `builtin-addons/core-buttons/src/index.test.ts`: proves `toggle-status` reconciles through command reads and preserves authoritative truth on reconciliation failures.
- `packages/cli/src/deck/runtime.test.ts`: guards against local inversion by verifying the runtime uses `toggle_command` followed by `status_command`.
- `packages/cli/src/render/text-image.ts`: gives `toggle-status` a restrained chrome distinction from `internal` and `get-set` while staying on the shared toggle card family.
- `packages/cli/src/render/text-image.test.ts`: verifies all three shipped toggle modes are visually distinguishable inside the same family.
- `packages/cli/fixtures/phase-14/config.toggle-toggle-status.yml`: committed real-surface fixture for the `toggle-status` path.
- `.planning/phases/14-richer-built-in-toggles/14-UAT.md`: finishes the Phase 14 manual review path for all three shipped modes.

## Decisions made
- Reused one authoritative read path for both command-driven modes and kept the write behavior as the only per-mode branch.
- Added a third restrained mode accent for `toggle-status` so the final UAT can distinguish all shipped authority models without introducing a new renderer family.

## Deviations
- None.

## Notes for downstream
- Phase 14 execution is complete; the next checkpoint is `verify-work 14` for manual UAT across the three committed fixtures.
