---
phase: 44
status: passed
verified: 2026-06-04
---

# Phase 44: Media-Volume Buttons — Verification

## Must-Have Results

| Plan  | Must-Have                                                                                                       | Status |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------ |
| 44-01 | `MediaVolumeController` interface and factory function defined                                                  | ✓      |
| 44-01 | Linux adapter uses pactl against `@DEFAULT_SINK@`                                                                | ✓      |
| 44-01 | macOS adapter uses osascript without sudo                                                                      | ✓      |
| 44-01 | Windows adapter returns "unavailable" snapshot (no clean built-in CLI)                                          | ✓      |
| 44-01 | `MediaMuteButtonSchema` and `MediaVolumeButtonSchema` defined                                                   | ✓      |
| 44-01 | `media-mute` button registered with the media-player addon                                                       | ✓      |
| 44-01 | `media-mute` icon swaps between `volume-x` (muted, danger) and `volume-2` (unmuted, foreground)                  | ✓      |
| 44-01 | `media-volume` button registered, supports `variant: 'up' | 'down'`                                              | ✓      |
| 44-01 | `media-volume` tap: up adds 5%, down subtracts 5%                                                                | ✓      |
| 44-01 | `media-volume` renders the actual polled volume percentage                                                       | ✓      |
| 44-01 | `media-volume` renders the shared `Bars` component                                                              | ✓      |
| 44-01 | `media-volume` hold toggles mute                                                                                 | ✓      |
| 44-01 | Polling intervals: mute 2.5s, volume 1.5s                                                                       | ✓      |
| 44-01 | 7 render tests pass                                                                                            | ✓      |
| 44-01 | All existing media-player tests pass                                                                            | ✓*     |

\* Note: pre-existing test failures in `theme.test.ts` (11 schema validation issues from prior phases) and other files are documented in `39-01-SUMMARY.md` and are not introduced by Phase 44.

## Verification Details

- **Controller:** `media-volume-controller.ts` defines `MediaVolumeSnapshot` (with `available`, `muted`, `percentage`, `source` fields), `MediaVolumeController` interface (`getMuted`, `getSnapshot`, `getVolumePercent`, `setMuted`, `setVolume`), and the factory function with the OS switch.
- **OS adapters:** All 4 adapter files exist; Linux uses `pactl get-sink-mute @DEFAULT_SINK@` and `pactl get-sink-volume @DEFAULT_SINK@`; macOS uses `osascript` for `output muted of (get volume settings)` and `output volume of (get volume settings)`; Windows and unsupported return unavailable.
- **Schemas:** `MediaMuteButtonSchema` and `MediaVolumeButtonSchema` exported from `schemas.ts` with `variant: z.enum(['up', 'down'])`.
- **Buttons:** Both registered in `index.ts`. `media-mute` swaps `volume-x` ↔ `volume-2` and changes tone danger ↔ foreground. `media-volume` renders `▲`/`▼` arrow, percentage, and `Bars` progress.
- **Hold-to-mute:** `onPress` records `holdStartedAt`; `onRelease` toggles mute if elapsed ≥ 600ms.
- **Tests:** 7/7 pass in `media-volume.test.tsx`.

## Summary

**Score:** 15/15 must-haves verified

Phase goal achieved — `media-mute` and `media-volume` button types are bundled in the media-player addon with real OS audio state polling, fixed 5% volume step, hold-to-mute on volume buttons, and Windows-as-unavailable honesty.
