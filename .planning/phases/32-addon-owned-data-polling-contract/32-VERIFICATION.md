---
phase: 32
status: passed
verified: 2026-06-01
---

# Phase 32 Verification

## Goal

Move addon-specific polling/data-fetching logic out of core system modules into addon-owned callbacks so core only schedules intervals, passes callback payload props to render, and publishes rendered frames.

## Must-Have Verification

| Must-have | Status | Evidence |
|-----------|--------|----------|
| Core runtime contract is capability-agnostic and supports payload-first polling/render handoff | PASS | `packages/cli/src/addon/api.ts`, `packages/cli/src/deck/runtime.ts`, `32-01-SUMMARY.md` |
| Poll cadence and render cadence are independently configurable without collapsing to one loop | PASS | `packages/cli/src/deck/runtime.ts`, `packages/cli/src/deck/runtime.test.ts`, `32-01-SUMMARY.md` |
| System-status capability ownership moved to addon-local domain modules | PASS | `packages/cli/src/builtin-addons/system-status/domain/live-metrics.ts`, `packages/cli/src/builtin-addons/system-status/domain/display-metrics.ts`, `32-02-SUMMARY.md` |
| Media-player capability ownership and OS adapters moved to addon-local domain modules | PASS | `packages/cli/src/builtin-addons/media-player/domain/media-controller.ts`, `packages/cli/src/builtin-addons/media-player/domain/linux-media-controller.ts`, `packages/cli/src/builtin-addons/media-player/domain/macos-media-controller.ts`, `packages/cli/src/builtin-addons/media-player/domain/windows-media-controller.ts`, `32-03-SUMMARY.md` |
| Addon schemas own cadence defaults/validation for migrated built-ins | PASS | `packages/cli/src/builtin-addons/system-status/schemas.ts`, `packages/cli/src/builtin-addons/media-player/schemas.ts`, `32-02-SUMMARY.md`, `32-03-SUMMARY.md` |
| Core `/system/*` no longer owns system-status/media capability domains after big-bang cleanup | PASS | deleted: `packages/cli/src/system/live-metrics.ts`, `packages/cli/src/system/system-status.ts`, `packages/cli/src/system/media-controller.ts`, `packages/cli/src/system/linux-media-controller.ts`, `packages/cli/src/system/macos-media-controller.ts`, `packages/cli/src/system/windows-media-controller.ts`; retained core seams: `packages/cli/src/system/host-context.ts`, `packages/cli/src/system/session-monitor.ts` |
| Regression gate proves runtime payload/cadence flow plus system-status/media-player behavior | PASS | `pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/builtin-addons/system-status/index.test.ts src/builtin-addons/media-player/index.test.ts src/addon/loader.test.ts` => 59/59 pass |
| Follow-up regressions from locked fallback/toggle pending semantics are resolved | PASS | `packages/cli/src/builtin-addons/date-time/schemas.ts`, `packages/cli/src/builtin-addons/date-time/buttons/locked-time-tile.tsx`, `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.tsx`, `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/core-buttons/index.test.ts src/builtin-addons/date-time/index.test.ts` => 26/26 pass |

## Requirement Coverage

Phase 32 is a post-milestone follow-on after the v1.3 `TRF-*` requirements were already complete. It introduces no new `TRF-*` ids here; coverage traces to the Phase 32 roadmap goal, `32-CONTEXT.md`, and plans `32-01` through `32-04` with their must-have truths and regression gates.

## Integration Checks

| Integration | Status | Evidence |
|-------------|--------|----------|
| Runtime -> addon polling callback -> payload store -> render props -> deck publish | PASS | `packages/cli/src/deck/runtime.ts`, `packages/cli/src/deck/runtime.test.ts` |
| Addon loader/registry still resolves migrated built-ins through shipped path | PASS | `packages/cli/src/addon/builtin.ts`, `packages/cli/src/addon/loader.test.ts` |
| System-status button behavior (unavailable metrics + tap/hold) preserved on migrated path | PASS | `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx`, `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx`, `packages/cli/src/builtin-addons/system-status/index.test.ts` |
| Media-player unsupported degradation and fixed tap play/pause preserved on migrated path | PASS | `packages/cli/src/builtin-addons/media-player/button.tsx`, `packages/cli/src/builtin-addons/media-player/index.test.ts` |

## Verification Commands

```bash
pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/builtin-addons/system-status/index.test.ts src/builtin-addons/media-player/index.test.ts src/addon/loader.test.ts
pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/core-buttons/index.test.ts src/builtin-addons/date-time/index.test.ts
```

## Residual Notes

- `pnpm --filter sireno-deck-cli exec tsc --noEmit` remains noisy with broad pre-existing repo type errors outside this phase's migration scope, so it is not used as the truth gate for Phase 32 completion.
- Planning-state docs (`ROADMAP.md`, `STATE.md`, `AGENTS.md`, `REQUIREMENTS.md`) were stale before this verification and are updated as the final execute-phase closure step.

## Summary

Score: 8/8 must-haves verified.

Phase 32 goal is achieved: core runtime now stays capability-agnostic while addon-owned polling callbacks produce payloads that flow into render props, system-status and media-player capability domains live under addon ownership, core system/media capability seams are removed in one big-bang migration, and the focused end-to-end regression gate passes cleanly.
