---
phase: 4
status: human_needed
verified: 2026-05-13
---

# Phase 4: Advanced Buttons - Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 04-01 | `packages/cli/src/core/schemas.ts` validates toggle buttons with shared `states[]`, explicit state `key` values, and optional `status_command` | ✓ |
| 04-01 | `packages/cli/src/deck/runtime.ts` advances internal toggles before running the new state's command | ✓ |
| 04-01 | `packages/cli/src/deck/runtime.ts` keeps external toggles authoritative and refreshes them from active-deck polling instead of optimistic local flips | ✓ |
| 04-01 | Deck navigation restarts per-button polling for the newly active deck and stops polling for the inactive deck | ✓ |
| 04-01 | Toggle runtime tests cover internal cycling, external status matching, and active-deck polling lifecycle | ✓ |
| 04-02 | `packages/cli/package.json` declares the `systeminformation` dependency | ✓ |
| 04-02 | `packages/cli/src/system/live-metrics.ts` exports a narrow adapter for CPU and memory button data | ✓ |
| 04-02 | `packages/cli/src/core/schemas.ts` validates built-in `cpu` and `memory` button config including interval and display-mode fields | ✓ |
| 04-02 | `packages/cli/src/deck/runtime.ts` refreshes CPU and memory buttons through active-deck polling | ✓ |
| 04-02 | CPU and memory render tests cover both progress-oriented and text-oriented rich layouts | ✓ |
| 04-03 | `packages/cli/src/core/schemas.ts` validates built-in `fan` and `media` button config using the approved command and fallback contracts | ✓ |
| 04-03 | `packages/cli/src/system/live-metrics.ts` returns an explicit unavailable result for unreadable fan data instead of throwing or leaking platform-specific empties | ✓ |
| 04-03 | `packages/cli/src/deck/runtime.ts` keeps media button state authoritative from `status_command` and renders multiline `display_command` output | ✓ |
| 04-03 | `packages/cli/src/render/text-image.ts` renders dedicated rich layouts for fan and media buttons | ✓ |
| 04-03 | Tests cover fan unavailable fallback and media play/pause plus multiline metadata display | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| BTN-04 | Toggle schema and internal state cycling in `packages/cli/src/core/schemas.ts` and `packages/cli/src/deck/runtime.ts` | ✓ |
| BTN-05 | External toggle authority via `status_command` polling in `packages/cli/src/deck/runtime.ts` | ✓ |
| BTN-07 | CPU metric adapter plus rich runtime/render path in `packages/cli/src/system/live-metrics.ts`, `packages/cli/src/deck/runtime.ts`, and `packages/cli/src/render/text-image.ts` | ✓ |
| BTN-08 | Memory metric adapter plus rich runtime/render path in `packages/cli/src/system/live-metrics.ts`, `packages/cli/src/deck/runtime.ts`, and `packages/cli/src/render/text-image.ts` | ✓ |
| BTN-09 | Fan sensor normalization and unavailable fallback in `packages/cli/src/system/live-metrics.ts`, `packages/cli/src/deck/runtime.ts`, and `packages/cli/src/render/text-image.ts` | ✓ |
| BTN-10 | Media control command execution plus authoritative metadata polling in `packages/cli/src/deck/runtime.ts` and `packages/cli/src/render/text-image.ts` | ✓ |

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `runtime.ts` -> `../system/live-metrics.js` | `getCpuMetric`, `getMemoryMetric`, `getFanMetric` | ✓ |
| `runtime.ts` -> `../render/reconciler.js` | `DeckButtonProps` carries `displayValue`, `detailLines`, `progress`, `subtitle`, `variant` | ✓ |
| `text-image.ts` -> runtime render payload | `variant`-specific render paths exist for toggle, metric, fan, and media cards | ✓ |

## Automated Checks

| Check | Result |
|------|--------|
| `pnpm test` | ✓ 72 tests passed |
| `pnpm build` | ✓ build completed |

## Summary

**Score:** 15/15 must-haves verified automatically

All automated checks passed. 5 items still need human testing on real hardware:
- Confirm an internal toggle button cycles visible state on each tap and executes the next state's command on-device.
- Confirm an external toggle button updates from `status_command` after navigation, with inactive decks no longer polling.
- Confirm CPU and memory buttons visibly refresh at their configured cadence and the metric layouts are readable on-device.
- Confirm fan buttons show the first readable graphics-controller RPM, including `0 RPM` when the fan is idle, and the configured unavailable fallback when no readable sensor exists.
- Confirm media buttons toggle play/pause through the configured command and render live multiline metadata from `playerctl`-style commands.

## Notes

- This verification is code-level plus automated-runtime coverage only. Phase 4's remaining uncertainty is physical-device UAT, not missing implementation coverage.
- Review closure: Phase 4 fan behavior is verified against the narrow v1 contract already shipped in code: use the first readable `graphics.controllers[]` fan sensor, treat `0 RPM` as valid data, and render the unavailable fallback when none are readable. A smarter multi-sensor ranking heuristic would be new scope, not remaining review debt.
