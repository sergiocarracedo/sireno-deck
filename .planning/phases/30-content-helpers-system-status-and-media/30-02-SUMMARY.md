# Plan 30-02 Summary

**Completed:** 2026-05-30

## What was built
Phase 30's second slice landed the first real helper-template addon family: bundled `system-status` buttons backed by one canonical metric catalog and a bounded support layer. The repo now has a shared system metric seam with explicit metric ids, honest unavailable states, and a dedicated mapping layer that applies numbro-backed formatting and metadata overrides before render time. On top of that seam, the bundled `system-status` addon ships two mounted button types: `system-status-bars` and `system-status-label-values`. Both load through the real bundled-addon registry path, preserve unavailable slots in place, and support optional tap and hold commands through a button-local long-press timer instead of widening runtime event semantics.

## Key files
- `packages/cli/src/system/live-metrics.ts`: expands the existing metric helpers into the canonical Phase 30 metric catalog and batch lookup seam.
- `packages/cli/src/system/system-status.ts`: maps canonical metrics plus overrides into display-ready values with bounded formatter choices.
- `packages/cli/src/builtin-addons/system-status/schemas.ts`: validates the two system-status helper templates, bounded metric counts, override fields, and optional tap/hold commands.
- `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx`: renders 1-3 canonical metrics through `Bars` with explicit unavailable footer slots.
- `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx`: renders 1-4 canonical metrics through `LabelValueList` with icon, unit, and override support.
- `packages/cli/src/builtin-addons/system-status/index.ts`: registers the bundled addon through the shipped addon path.
- `packages/cli/src/builtin-addons/system-status/index.test.ts`: proves registry/config/runtime integration, unavailable rendering, and distinct tap-vs-hold behavior.
- `packages/cli/src/addon/builtin.ts`: includes `system-status` in the bundled addon registry.

## Decisions made
- Kept one canonical metric catalog in `live-metrics.ts` rather than letting button configs talk to raw `systeminformation` shapes.
- Kept formatter policy in `system-status.ts`, not in `Bars` or `LabelValueList`, preserving the helper surface as presentation-only.
- Implemented optional hold behavior locally inside the buttons with `onPress` / `onRelease` / `onTap` plus a 600ms timer because the runtime currently does not have a native long-press threshold.
- Used `globalThis.setTimeout` and `globalThis.clearTimeout` so fake-timer tests can exercise the hold path truthfully.

## Deviations
- The plan's broad verify command included `src/deck/runtime.test.ts`, but that suite currently has unrelated failures in dirty pre-existing seams outside this slice: the locked-time fallback contract and the get-set toggle contract. The system-status-specific addon, registry, and loader verification passed independently and were used as the truthful gate for this slice.

## Notes for downstream
- Wave 3 can reuse the same local hold-timer pattern for the media-player button because the runtime still lacks a native long-press threshold.
- The broader runtime failures should be handled as separate drift before they block a later full-phase verification pass.
