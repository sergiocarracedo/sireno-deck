# Phase 09 Research

**Date:** 2026-06-24
**Goal:** Validate the implementation approach for porting 7 legacy built-in addons.

## Legacy patterns inspected

- `defineMountedButton` helper — legacy uses this to wrap button definitions. **Not present in v3**. v3 uses `AddonButtonTypeDefinition` directly (no `store`, no `poll`, no `onActivate`, no `payload`).
- `useButtonActionCommand` — legacy wrapper that adds tap/dbl-tap/hold handlers from `config.commands`. **Not in v3**. We replicate inline in `onTap`/`onDblTap`/`onHold`.
- `store.button.update` / `store.button.snapshot` — legacy local per-button store. **Not in v3**. We use React `useState` inside `render` instead.
- `poll` callback — legacy periodic refresh returning `payload`. **Not in v3**. We use `useEffect` + `setInterval` for refresh.

## Adaptations from legacy → v3

| Legacy pattern | v3 equivalent |
| -------------- | ------------ |
| `defineMountedButton({ ... })` | `AddonButtonTypeDefinition` object literal |
| `defaultIntervalMs` | `defaultRenderIntervalMs` |
| `defaultPollIntervalMs` + `poll` | `useEffect` + `setInterval` inside `render` |
| `store.button.update(snapshot => ...)` | `useState` + setter |
| `payload.metrics` from `poll` | `useState` array |
| `onActivate` lifecycle | `useEffect` with empty deps + cleanup |
| `useButtonActionCommand` | Inline `onTap`/`onDblTap`/`onHold` reading `config.commands` |
| `ButtonSurface` wrapper | (Not needed; render returns plain React) |

## Date/time (legacy `date-time/`)

- 6 buttons: `date-time`, `time`, `date`, `clock`, `analog-clock`, `locked-time-tile`
- Uses `dayjs` for formatting; we use `Intl.DateTimeFormat` instead (no extra dep)
- `formatDigitalDateTimeLabel(format, date)` parses a pattern with `<markup>` tags
- We port the parser logic to `Intl.DateTimeFormat` for our base format (`HH:mm:ss`, `DD/MM/YYYY`, etc.)
- Defaults: `DIGITAL_DATE_TIME_INTERVAL_MS = 1000`, `ANALOG_CLOCK_INTERVAL_MS = 1000`, `DATE_BUTTON_INTERVAL_MS = 60000`

## System-status (legacy `system-status/`)

- 1 button: `system-status` with `variant: 'text' | 'bars'` + `metrics: [{ metric, label, ... }]`
- Uses `os.cpus()`, `os.totalmem()`, `os.freemem()`, `os.loadavg()`
- Battery on Linux: `/sys/class/power_supply/BAT0/capacity`
- Polls every `poll_interval_ms` (default 1000)
- Channels: publishes to `system:cpu`, `system:memory`, `system:battery`
- **v3 adaptation**: render uses `useEffect` to start a setInterval; uses `useState` to hold metrics; renders `<Bars>` from Phase 08 surfaces.

## Value-display (legacy `value-display/`)

- 1 button: `value-display` with `values: [{ label, command, formatter?, units? }]`
- Runs shell commands via `@/action/executor`
- Renders `<LabelValueList>` from Phase 08 surfaces
- **v3 adaptation**: same — `useEffect` + `useState` + `<LabelValueList>`

## Weather (legacy `weather/`)

- 1 button: `weather` with `config.location: { latitude, longitude, name? }`
- Open-Meteo fetch: `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=temperature_2m,wind_speed_10m,weather_code`
- `defaultIntervalMs = 600_000` (10 min)
- Renders temp + wind + weather code → human description

## Emoji-selector (legacy `emoji-selector/`)

- 4 buttons: `emoji-category-button`, `emoji-emoji-button`, `emoji-launcher-button`, `emoji-back-button`
- 1 deck: `emoji-selector` with `createDecks`
- `CATEGORY_DEFINITIONS` — 8 categories (smileys, nature, food, activities, travel, objects, symbols, flags) with curated emoji lists
- Pagination: `paginateDecks` from Phase 03
- `favorites: string[]` config — first category when populated
- Legacy uses `assets:` field with `favorites.svg` icon

## Media-player (legacy `media-player/`)

- 3 buttons: `media-player` (single surface with 5 sub-actions), `media-mute`, `media-volume`
- `MediaController` from `domain/media-controller.ts` consumes Phase 07 `MediaProvider`
- `createMediaController({ platform, executor })` builds it
- The single surface consumes 2 button slots (SplitAction)

## Brightness (legacy `brightness/`)

- 1 button: `brightness` with `action: 'up' | 'down' | 'set'`
- macOS: `osascript -e 'tell application "System Events" to key code 144'` (up) / 145 (down)
- `set` value: AppleScript brightness control
- Linux/Windows: no-op stub

## v3 manifest adaptation

| Legacy | v3 |
| ------ | --- |
| `apiVersion: 1` | `apiVersion: 3` |
| `frontend: './frontend'` | dropped (frontend bundled via `virtual:sireno/themes/manifest`) |
| `assets: { ... }` | dropped (assets inlined in components) |
| Default export: `SirenoAddon` | Same — also named exports for tests |

## Common pitfalls

1. **`useEffect` cleanup** — must `clearInterval` on unmount to prevent leaks
2. **React rendering interval vs poll interval** — Phase 08 ButtonFrame uses a 16ms tap animation; the `render` callback fires on every state change, so we should debounce if `poll_interval_ms` < 100 ms (not the default for any addon here)
3. **`osascript` stdout buffering** — must read stderr too for "Not authorized" type errors
4. **Open-Meteo rate limits** — 10-minute cadence is well below the 10k req/day free tier
5. **`createMediaController` requires Phase 07 runtime** — only call this when the runtime is initialized (not at module load time)

## Recommended approach

Implement each addon as a single folder under `packages/cli/src/builtin-addons/<name>/` with:
- `index.ts` — exports the `SirenoAddon` (default) and named buttons for tests
- `schemas.ts` — zod configs (mirrors legacy schemas.ts; drop `AddonButtonActionConfigSchema` extension since v3 doesn't have it)
- `buttons/*.tsx` — one React button per type (renders through Phase 08 surfaces)
- `__tests__/*.test.ts` — unit tests for schemas + button definitions

Register all 7 in `register-builtins.ts`. Update `index.ts` barrel.

## Vertical slice strategy

- **Plan 01** (Wave 1): `date-time` + `value-display` + `system-status` — no OS-specific behavior, no deck generation, all use polling/timing
- **Plan 02** (Wave 2): `weather` + `emoji-selector` + `media-player` + `brightness` — OS-specific, deck generation, OS-asascript exec

Both plans produce a working emulator: Plan 01 brings time/date/value/system-status online (config validates for those types); Plan 02 brings weather/emoji/media/brightness.