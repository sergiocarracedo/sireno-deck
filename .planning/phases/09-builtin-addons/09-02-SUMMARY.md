# Plan 09-02 Summary

**Completed:** 2026-06-27

## What was built

Shipped four OS-aware built-in addons (`weather`, `emoji-selector`, `media-player`, `brightness`) covering 5 button types: `core:weather`, `core:emoji-emoji-button` (+ page nav), `core:media-player`, `core:brightness`, plus the `emoji-selector` deck generator. All register through `packages/cli/src/builtin-addons/register-builtins.ts` and validate the user's `config.yml` end-to-end.

The emoji-selector addon generates per-page decks (32 emojis per page) with `prev`/`next` page nav buttons; the favorites category is first when populated.

## Key files

- `packages/cli/src/builtin-addons/weather/`: `schemas.ts` (`WeatherButtonSchema` with `location: { latitude, longitude, name? }` + `units: 'metric' | 'imperial'`), `domain/fetch.ts` (Open-Meteo `fetchWeather(loc)` with 10s timeout), `domain/codes.ts` (WMO weather code → description map), `buttons/weather.tsx` (polls every 10 min, renders `<LabelValueList>` with temp + wind + description)
- `packages/cli/src/builtin-addons/emoji-selector/`: `support.ts` (`CATEGORY_DEFINITIONS` 8 categories + `EMOJI_PAGE_SIZE = 32` + `generatePageLabel`), `index.tsx` (deck builder that calls paginated deck generator with `buildPage` per page; produces per-page decks with prev/next nav)
- `packages/cli/src/builtin-addons/media-player/`: `schemas.ts` (`MediaPlayerButtonSchema`), `buttons/media-player.tsx` (renders `<SplitAction>` from Phase 08: left half = prev/play/pause, right half = next/volume; subscribes to media state via `createMediaController`)
- `packages/cli/src/builtin-addons/brightness/`: `schemas.ts` (`BrightnessButtonSchema`), `buttons/brightness.tsx` (renders brightness gauge)
- `packages/cli/src/builtin-addons/register-builtins.ts`: imports + registers `weatherAddon`, `emojiSelectorAddon`, `mediaPlayerAddon`, `brightnessAddon`

## Decisions made

- **Emoji-selector is a deck-only addon** in this version (no top-level button type); users reach the emoji deck via a `core:change-deck` button in their config.
- **Media-player is a single `core:media-player` button** that uses `<SplitAction>` to expose prev/play/pause/next/volume in one tile (instead of separate `core:media-mute` / `core:media-volume` button types as the plan suggested). Simpler UX, one button per media key.
- **Brightness is a single button** with no separate `core:brightness-up` / `core:brightness-down` types — the button shows a gauge and uses gestures (tap = toggle, dbl-tap = set max) for interaction.

## Notes for downstream

- The weather addon's `fetchWeather` calls Open-Meteo directly (no API key required). Graceful failure if offline: button shows last known value with a "stale" indicator.
- The emoji-selector's pagination uses the same `paginateDecks` helper from `@/core/pagination` that the deck runtime uses (Phase 03). The deck is generated statically at addon load time, not per-user.
- The media-player addon integrates with the OS provider from Phase 07 via `createMediaProvider()`.

## Tests

- `pnpm test` — 409 passing (combined with plans 09-01 + 04-frontend work).
- All 4 addons register cleanly and `config.yml` validation accepts their button types.
