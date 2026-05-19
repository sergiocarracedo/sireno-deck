# Plan 04-03 Summary

**Completed:** 2026-05-13

## What was built
Added the last Phase 4 built-in buttons: fan and media. Fan buttons now poll a narrow live-metrics adapter, render current RPM when a readable sensor exists, and fall back to a stable unavailable state when it does not. Media buttons remain command-driven for play/pause taps but refresh their visible state only from `status_command` and multiline `display_command` polling.

## Key files
- `packages/cli/src/system/live-metrics.ts`: adds normalized fan snapshots on top of the existing `systeminformation` adapter
- `packages/cli/src/deck/runtime.ts`: wires fan polling and authoritative media polling into the active-deck runtime
- `packages/cli/src/render/reconciler.ts`: carries multiline detail lines through the render payload
- `packages/cli/src/render/text-image.ts`: renders dedicated fan and media layouts in the existing SVG -> sharp path
- `packages/cli/src/deck/runtime.test.ts`: covers fan fallback and media action/state behavior

## Decisions made
- Reused the existing runtime state map and widened the render payload with `detailLines` rather than introducing a new advanced-button rendering API.
- Locked the v1 fan contract to the first readable graphics-controller fan sensor, with `0 RPM` treated as valid telemetry and an explicit unavailable fallback when no readable sensor exists. We did not add a broader ranking heuristic because generic cross-platform fan data is not a clean `systeminformation` primitive.

## Deviations
- None. The plan scope matched the implementation directly.

## Notes for downstream
- Phase 4 execution is now complete. The next workflow step is verification against the roadmap success criteria and any available manual UAT path.
