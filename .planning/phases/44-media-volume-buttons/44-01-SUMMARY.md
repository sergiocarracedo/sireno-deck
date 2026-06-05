# Plan 44-01 Summary

**Completed:** 2026-06-04

## What was built

Two new bundled button types in the media-player addon: `media-mute` (toggle mute with real state) and `media-volume` (with `variant: 'up' | 'down'`, fixed 5% step, hold toggles mute). Both render the actual polled state via `Intl`-derived percentages and the shared `Bars` component. OS adapters: Linux uses pactl against `@DEFAULT_SINK@`, macOS uses osascript, Windows and unsupported platforms return "unavailable" snapshots.

## Key files

- `packages/cli/src/builtin-addons/media-player/domain/media-volume-controller.ts` — `MediaVolumeSnapshot`, `MediaVolumeController` interface, `createMediaVolumeController` factory
- `packages/cli/src/builtin-addons/media-player/domain/linux-media-volume-controller.ts` — pactl adapter
- `packages/cli/src/builtin-addons/media-player/domain/macos-media-volume-controller.ts` — osascript adapter
- `packages/cli/src/builtin-addons/media-player/domain/windows-media-volume-controller.ts` — unavailable adapter
- `packages/cli/src/builtin-addons/media-player/domain/unsupported-media-volume-controller.ts` — generic unavailable
- `packages/cli/src/builtin-addons/media-player/schemas.ts` — `MediaMuteButtonSchema`, `MediaVolumeButtonSchema` (with `variant` enum)
- `packages/cli/src/builtin-addons/media-player/buttons/media-mute.tsx` — icon swaps `volume-x` / `volume-2` based on muted state
- `packages/cli/src/builtin-addons/media-player/buttons/media-volume.tsx` — up/down variants, percentage + `Bars` progress, hold-to-mute
- `packages/cli/src/builtin-addons/media-player/buttons/media-volume.test.tsx` — 7 render tests
- `packages/cli/src/builtin-addons/media-player/index.ts` — registers both new buttons

## Decisions made

- **`MediaVolumeController` interface** — added `getMuted()` and `getVolumePercent()` (in addition to `getSnapshot()`) so the buttons can read individual state without doing a full snapshot
- **`render_interval_ms` and `poll_interval_ms` in schemas** — defaults 2.5s for mute, 1.5s for volume
- **`Bars` API** — uses the `items` array shape (not `value`/`max`) since that's the only API `Bars` actually exposes
- **Hold-to-mute logic** — uses `onPress` to record `holdStartedAt` timestamp, `onRelease` to check elapsed and toggle mute if `>= 600ms`

## Notes for downstream

- 7 new render tests pass
- Pre-existing test failures in `theme.test.ts` and other files (documented in `39-01-SUMMARY.md`) are not introduced by this plan
- Windows support is intentionally absent in v1.4; the adapter returns "unavailable" snapshot honestly
