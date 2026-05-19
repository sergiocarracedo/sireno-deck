# Plan 14-01 Summary

**Completed:** 2026-05-19

## What was built
Phase 14 now ships a real bundled `toggle` button in `internal` mode through the existing addon contract, with one discriminated config branch, runtime-owned in-process state, and a narrow render signal that keeps the visual difference inside the existing toggle card family. The runtime preserves that internal state across deck leave/re-entry and reconnect-style deck re-activation within the same daemon, and the repo now includes a committed fixture plus UAT path to review the behavior on the real CLI/device surface.

## Key files
- `packages/cli/src/core/schemas.ts`: defines the single-type built-in toggle config contract for `mode: "internal"`.
- `builtin-addons/core-buttons/src/index.ts`: ships the bundled toggle definition and runtime-owned internal toggle behavior.
- `packages/cli/src/deck/runtime.test.ts`: pins internal toggle continuity across deck re-activation and reconnect-style runtime activation.
- `packages/cli/src/render/types.ts`: carries `toggle_mode` through the public render description shape.
- `packages/cli/src/render/reconciler.ts`: preserves `toggle_mode` through helper-authored and JSX-authored render descriptions.
- `packages/cli/src/render/text-image.ts`: applies an internal-mode accent while staying on the shipped toggle card path.
- `packages/cli/fixtures/phase-14/config.toggle-internal.yml`: committed real-surface review fixture for the internal toggle path.
- `.planning/phases/14-richer-built-in-toggles/14-UAT.md`: focused Phase 14 manual review steps for internal toggle behavior.

## Decisions made
- Treated reconnect coverage as `runtime.activateCurrentDeck()` re-activation because that is the actual seam used by `start.ts` on Stream Deck reconnect.
- Kept the internal-mode visual divergence narrow by changing existing toggle chrome instead of introducing a bespoke renderer.

## Deviations
- The repo already contained the Task `14-01-01` contract work in commit `3b57ae1`, so execution continued from Task `14-01-02` rather than duplicating that atomic step.

## Notes for downstream
- `14-UAT.md` currently covers only the internal toggle review path; Wave 2 and Wave 3 should extend the same file for `get-set` and `toggle-status` without widening this first review case.
