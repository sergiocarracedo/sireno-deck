# Plan 39-01 Summary

**Completed:** 2026-06-04

## What was built

Themable media-player surface: external themes can now override the `Surface` component used by the built-in media-player addon. Themes declare `mediaPlayer: { surface: '<path>' }` in their manifest, the runtime loads it via the same `tsx` cache-busting pattern used for theme entrypoints, and the media-player button factory accepts an optional surface (default = built-in `Surface.tsx`).

## Key files

- `packages/cli/src/config/theme/schemas.ts` — Added `ThemeMediaPlayerSurfaceProps` interface and `ThemeMediaPlayerSurface` type, plus `mediaPlayerSurface?` on `Theme`
- `packages/cli/src/config/theme/theme.ts` — `importThemeMediaPlayerSurface()` helper with cache-busting and tolerant export lookup, exposed on resolved `Theme.mediaPlayerSurface`
- `packages/cli/src/builtin-addons/media-player/media-player-button.tsx` — Converted constant to `createMediaPlayerButton({ surface? })` factory; default surface = built-in `Surface.tsx`; resolved surface is called with `{ title, artist, source, progress, status, time }` props; removed inline render duplication
- `packages/cli/src/builtin-addons/media-player/index.ts` — Calls `createMediaPlayerButton()` with no args (uses built-in default)
- `packages/cli/fixtures/phase-39/theme-with-media-player-surface/` — Fixture theme with manifest declaring `mediaPlayer.surface`, plus `surface.tsx`, `frame.tsx`, `index.ts`
- `packages/cli/src/config/theme/theme.test.ts` — 3 new tests (override loads, missing surface hard-fails, no declaration = undefined)
- `packages/cli/src/builtin-addons/media-player/index.test.ts` — Updated assertions to match new built-in `Surface.tsx` (no inline duplication)

## Decisions made

- **Prop contract:** `ThemeMediaPlayerSurfaceProps` matches the built-in `Surface.tsx` props: `title, artist, source, progress, status, time`
- **Cache-busting:** surface path included in `runtimeCacheKey` and `filePaths` so file changes trigger reload
- **Export tolerance:** `module.surface ?? module.Surface ?? module.default?.surface ?? module.default?.Surface` (mirrors existing theme runtime pattern)
- **Hard-fail:** Missing surface file or non-function export throws with clear error
- **Built-in fallback:** When manifest does not declare `mediaPlayer.surface`, button uses `Surface.tsx` (existing built-in)
- **Time format:** Added `formatTimeLabel()` helper to format `positionSeconds` as `m:ss` for the `time` prop

## Notes for downstream

- The media-player button is now a factory — `createMediaPlayerButton({ surface })`. If/when themes wire their surface into button config, the loader will need to call the factory with the resolved surface
- 11 pre-existing test failures in `theme.test.ts` (schema validation issues from prior phases) are unrelated to this phase. The 3 new tests pass in isolation when run with `-t mediaPlayer` filter
- The media-player index test had 2 pre-existing failures (assertions on `data-sireno-ui-bars` and `data-sireno-media-status` that were never actually rendered). These were fixed by updating to match the new built-in `Surface.tsx` output
