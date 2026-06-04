# Architecture Research — v1.4 Build, Bundle & UX Polish

**Domain:** Standalone executable distribution, calendar button, weather addon, media-player mute/volume, emoji-selector multi-page, system-reserved back button
**Researched:** 2026-06-04
**Confidence:** HIGH (existing code, Node SEA) / MEDIUM (cross-cutting back-button change)

---

## Component Boundaries

### The milestone pressure matrix

| Component | Current role | v1.4 pressure |
|-----------|--------------|----------------|
| `tsdown.config.ts` | Bundle ESM entries (`cli.js`, `index.js`) from `packages/cli/src/` to `packages/cli/dist/`. | Add a second build entry that wraps the same `dist/cli.js` into a Node SEA via `sea-config.json`. Keep `unbundle: true` and the rest of the config stable so the dev loop doesn't change. [HIGH: `tsdown.config.ts:1-14`] |
| `packages/cli/src/cli/index.ts` | The shebang entry; yargs CLI surface. | **No change** for the standalone build. The SEA injects *this* file as the entry. The yargs commands stay identical. [HIGH: `cli/index.ts:1-84`] |
| `packages/cli/src/cli/commands/start.ts` | `loadRuntimeConfig` + `startDaemon` / `startEmulator` / `ensureBrowserRenderer`. | Extend `ensureBrowserRenderer` to detect missing Chromium and run `playwright install --with-deps chromium` *once* before the first browser launch attempt. Treat Chromium-not-present the same way we already treat "missing chromium" in tests. [HIGH: `start.ts:319-349`, `start.test.ts:911-919`] |
| `packages/cli/src/render/browser-renderer.ts` | Owns Playwright loading and key-buffer capture. | Same change. The `loadPlaywrightLauncher` already lazy-imports `playwright` and calls `.chromium`; the new "ensure installed" guard wraps that. [HIGH: `browser-renderer.ts:80-83`] |
| `packages/cli/src/deck/runtime.ts` | Hosts the per-deck button loop; computes `reservedBackKeyIndex` but never enforces it. | Inject a virtual `system-back` button at `keyCount - 1` for any non-main deck. Map its `onTap` to `goBack`, its `onPress` to `goHome` (restore stack to `[mainDeckId]`). Skip injection for the main deck — render an empty key there. [HIGH: `runtime.ts:277, 797-826, 1168-1181, 1219-1221`] |
| `packages/cli/src/deck/controller.ts` | Stack of `deckId`; `goBack` / `navigateTo` / `restoreStack`. | Add `goHome()` that resets the stack to `[mainDeckId]`. Today `restoreStack([mainDeckId])` does exactly that. Either expose it as `goHome` or pass `[mainDeckId]` directly from the back button. [HIGH: `controller.ts:67-78`] |
| `packages/cli/src/core/schemas.ts` | Zod validation for the whole config tree. | Add a per-deck validation rule: `position` for any `ButtonInstance` must be `< keyCount - 1` (or `<= keyCount - 2` in 0-indexed terms). The reserved position is read from `device.key_count` if present, else from the device runtime, else defaulted to 15. [HIGH: `core/schemas.ts:106-180`] |
| `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx` | Literal stub with `asd2` text. | Replace with a real vertical layout: small month (accent), large day, small weekday. The schema and registration are already in place. [HIGH: `calendar-sheet.tsx:30-43`, `schemas.ts:41-45`] |
| `packages/cli/src/builtin-addons/date-time/schemas.ts` | Holds `BuiltinCalendarSheetButtonSchema` and `CALENDAR_SHEET_INTERVAL_MS = 60000`. | No new fields. The schema is correct as-is. [HIGH: `schemas.ts:7, 41-45`] |
| `packages/cli/src/builtin-addons/emoji-selector/index.ts` | `createDecks` returns 1 main + N category decks with hardcoded positions 0-14 + back at 14. | Refactor `createDecks` to page categories by `EMOJI_PAGE_SIZE` (default 14 - 3 reserved = 11 slots). Each page deck has `positions 0..N-1` for emojis, position `N` for prev-page (or hidden on first page), `N+1` for next-page (or hidden on last page), `N+2` for back-to-category. The "main" deck gains prev/next only when on a paged category. [HIGH: `emoji-selector/index.ts:36-83`] |
| `packages/cli/src/builtin-addons/media-player/domain/{linux,macos,windows}-media-controller.ts` | Per-OS adapter that returns a `MediaController`. Linux uses `playerctl`; macOS and Windows return `createUnavailableMediaSnapshot`. | Add `getMute()`, `setMute(boolean)`, `getVolume()`, `setVolume(percent)` to the `MediaController` interface. Implement on Linux via `pactl set-sink-mute @DEFAULT_SINK@ toggle` and `set-sink-volume @DEFAULT_SINK@ +5%`. Implement on macOS via `osascript -e 'set volume output muted not (output muted of (get volume settings))'` and `set volume output volume N`. Leave Windows unavailable. [HIGH: `media-controller.ts:24-39`, pactl(1), osascript] |
| `packages/cli/src/builtin-addons/media-player/media-player-button.tsx` | Already supports `hold_command`. | Add a sibling button type `media-volume` that takes a `direction: 'mute' | 'up' | 'down'` config. Reuse `useButtonActionCommand` for tap/hold. On tap, the button calls the controller's corresponding verb. On hold, it could repeat (pactl `+/-N%` once per ~250 ms while held). [HIGH: `media-player-button.tsx`, `api.ts:139-246`] |
| `packages/cli/src/builtin-addons/weather/...` | New addon. | Mirrors `media-player`: `domain/{weather-api,geolocation}.ts` + `components/Surface.tsx` + `buttons/weather-button.tsx` + `index.ts`. Default backend is Open-Meteo; geolocation is opt-in. |
| `packages/cli/src/addon/builtin.ts` | Lists bundled addons. | Add `weatherAddon` to the list. [HIGH: `addon/builtin.ts:9-17`] |
| `packages/cli/src/render/dom-host.tsx` | Renders a mounted React tree into HTML. | Unchanged. New addons use the existing `ButtonSurface`/`Text`/`Icon` primitives. [HIGH: `dom-host.tsx`] |

### The core seam that changes the most: position 14

`reservedBackKeyIndex` is computed as `Math.max(0, (options.keyCount ?? 15) - 1)` (`runtime.ts:277`) but is only read by `getReservedBackKeyIndex()` (`runtime.ts:1219-1221`). Nothing in the codebase enforces that no button ever claims that position. Three things must change together to fix that:

1. **Config validation** (`core/schemas.ts`): every `ButtonInstance` with `position >= keyCount - 1` (or whatever the device's `keyCount` resolves to) is a validation error with a path-aware message like "Position 14 is reserved for the system back button; positions 0–13 are available."
2. **Runtime injection** (`deck/runtime.ts`): after `expandDecks` produces the final per-deck button list, the runtime injects a synthetic `system-back` button at the reserved position for every non-main deck. The main deck's reserved position is rendered as a blank slot.
3. **Controller augmentation** (`deck/controller.ts`): add a `goHome()` method that does `restoreStack([mainDeckId])`, so the new back button's hold-gesture has a single call site.

The validation step is what makes the change safe — without it, an existing user config could have a button at position 14 and the runtime would silently overwrite it. [HIGH: all three files above]

### The weather addon component layout

```
packages/cli/src/builtin-addons/weather/
├── index.ts
├── buttons/
│   └── weather-button.tsx
├── components/
│   ├── Surface.tsx       ← themable, like media-player's
│   ├── WmoIcon.tsx       ← WMO code → Lucide icon name
│   └── WmoIconName.ts    ← WmoCode enum + Lucide name map
├── domain/
│   ├── weather-controller.ts   ← WeatherController interface
│   ├── open-meteo-client.ts    ← fetch + parse Open-Meteo JSON
│   ├── wttr-in-fallback.ts     ← optional fallback fetch
│   └── ip-geolocation.ts       ← opt-in IP lookup
├── schemas.ts
└── assets/                     ← if we add custom SVG icons
```

This mirrors the media-player addon's shape exactly. The same themable `Surface` mechanism we just shipped (Phase 39) means the weather button gets theme override for free. [HIGH: `media-player/` layout, Phase 39]

### The media-volume button shape

```
packages/cli/src/builtin-addons/media-player/
├── buttons/
│   └── media-volume-button.tsx   ← new file
├── media-player-button.tsx       ← unchanged
└── index.ts                      ← adds the new button to the addon
```

`media-volume-button.tsx` accepts `{ direction: 'mute' | 'up' | 'down' }` and calls the matching controller verb on tap. No new OS surface is needed; we just expand the `MediaController` interface and implement on each OS. [HIGH: `media-controller.ts:24-27`]

---

## Data Flow

### Build / distribute flow (new)

```
┌──────────────────────────┐
│ packages/cli/src/...     │   (existing source)
└──────────┬───────────────┘
           │ tsdown
           ▼
┌──────────────────────────┐
│ packages/cli/dist/cli.js │   (existing ESM bundle)
│ packages/cli/dist/index.js
└──────────┬───────────────┘
           │ node --build-sea sea-config.json
           ▼
┌──────────────────────────┐
│ sireno-deck-linux-x64    │   (one binary per platform)
│ sireno-deck-macos-arm64  │
│ sireno-deck.exe          │
└──────────┬───────────────┘
           │ copy to /works/test/test-sireno-deck
           ▼
┌──────────────────────────┐
│ /works/test/test-sireno-deck/   (release artifact dir, outside repo)
└──────────────────────────┘
```

The two-stage build is the key: `tsdown` produces the bundle; `node --build-sea` wraps it. Both stages can run on the same host. The second stage is CI-only — `pnpm cli:dev` never sees it. [HIGH: Node SEA, `tsdown.config.ts`]

### First-run Chromium install (new)

```
user runs ./sireno-deck start
        │
        ▼
start.ts → ensureBrowserRenderer
        │
        ▼
playwright.chromium.executablePath() throws?  ── no ──▶ start
        │
        yes
        ▼
sireno-deck is missing chromium. installing (~280MB) once...
        │
        ▼
exec('npx', ['playwright', 'install', '--with-deps', 'chromium'])
        │
        ▼
write ~/.cache/sireno-deck/chromium-installed
        │
        ▼
start
```

The marker file makes the install idempotent. `playwright install` itself is also idempotent — re-running it on a populated cache is fast. [HIGH: Playwright browsers docs, `start.ts:319-349`]

### System-reserved back button (new)

```
config.yml parsed by core/schemas.ts
        │
        ▼
validation: button.position must be < keyCount - 1
        │ (else ConfigValidationError, path = decks.<id>.buttons.<i>.position)
        ▼
expandDecks() returns button lists
        │
        ▼
runtime.start() / activateDeckSurface(deckId)
        │
        ▼
for each deck:
    if deckId == mainDeckId: skip reserved position (render empty)
    else: inject system-back button at position keyCount-1
        │
        ▼
user presses key 14
        │
        ▼
onKeyEvent('down', keyIndex=14) → handlePress(14)
        │  (waits 600ms via api.ts:85 hold timer)
        ▼
if released before 600ms → onTap → controller.goBack()
if held past 600ms     → onPress → controller.restoreStack([mainDeckId])
        │
        ▼
activateDeckSurface with new active deck
```

The 600ms hold threshold already exists in `api.ts:85`; we reuse it. `controller.restoreStack([mainDeckId])` is already implemented (`controller.ts:67-78`) — we just need to call it. [HIGH: `api.ts:85`, `controller.ts:67-78`, `runtime.ts:1168-1199`]

### Multi-page emoji selector (new)

```
CATEGORY_DEFINITIONS still static, e.g. 34 emojis
        │
        ▼
createDecks() pages by EMOJI_PAGE_SIZE (11)
        │
        ▼
generates 4 decks: "smileys-1", "smileys-2", "smileys-3", "smileys-4"
        │ (last page has fewer than EMOJI_PAGE_SIZE emojis; remaining positions are empty)
        ▼
"smileys-1" deck:
    positions 0..10 → 11 emoji-entry buttons
    position 11     → next-page button (smileys-2)
    no back (because we're not on the category main)

"smileys-2" deck:
    positions 0..10 → 11 emoji-entry buttons
    position 11     → prev-page button (smileys-1)
    position 12     → next-page button (smileys-3)

last page:
    positions 0..N-1 → emojis
    position N       → prev-page button
```

The category main deck is a separate deck that just lists categories. The "back" button in emoji-selector's own decks moves up one level. The "next" and "prev" page buttons are just `change-deck` buttons. The hard-reserved system back button (added by the runtime) sits at `keyCount - 1` regardless. [HIGH: `emoji-selector/index.ts:36-83`]

### Weather addon (new)

```
onActivate → controller.getSnapshot()
        │
        ▼
getCoordinates()  ← config.location OR (config.use_ip_geolocation? ipapi.co : null)
        │
        ▼
fetch Open-Meteo: api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=celsius
        │
        ▼
parse response → { temperature, weatherCode, windSpeed, location }
        │
        ▼
render: WmoIcon(weatherCode) + "72°" + Text("Madrid" | label)
```

Configurable cadence: default 600,000 ms (10 min) — weather doesn't need 1-second updates. [HIGH: Open-Meteo `current` param, `media-player/schemas.ts:6-7` for cadence precedent]

### Media-volume button (new)

```
onTap → controller.setMute(!currentMute)  OR  controller.setVolume(currentVolume ± 5)
        │
        ▼
linux:   pactl set-sink-mute @DEFAULT_SINK@ toggle
          pactl set-sink-volume @DEFAULT_SINK@ +5%
macos:   osascript -e 'set volume output muted not (output muted of (get volume settings))'
          osascript -e 'set volume output volume ((output volume of (get volume settings)) + 5)'
windows: createUnavailableMediaSnapshot('windows-unsupported')
        │
        ▼
onTap: optionally re-poll snapshot to update button label
```

Real-state detection is straightforward: pactl `get-sink-mute` and `get-sink-volume`, osascript `get volume settings`. [HIGH: pactl(1) `get-sink-mute`/`get-sink-volume`, SS64 osascript]

---

## Build Order

1. **Add `sea-config.json` and a `pnpm cli:build:sea` script.** Validate that `node --build-sea sea-config.json` produces a working `sireno-deck` binary on the current Linux host. No CI yet. [HIGH: Node SEA]
2. **Add the first-run Chromium guard.** A small helper around `playwright.chromium.executablePath()`; caches an "installed" marker; falls through to a friendly error if even the install fails. [HIGH: Playwright docs, `start.ts:319-349`]
3. **Implement the calendar button render.** Schema, registration, interval, and addon slot are already in place — only the render function needs filling in. [HIGH: `calendar-sheet.tsx`]
4. **Implement the system-reserved back button at the core level.** This is the most invasive change:
   - Add `goHome()` (or reuse `restoreStack([mainDeckId])`) in `controller.ts`.
   - Inject `system-back` in `runtime.ts` for every non-main deck.
   - Add the position validation rule in `core/schemas.ts`.
   - Update existing test fixtures and config.yml if any of them place a button at position 14.
5. **Add the `media-volume` button type and expand the `MediaController` interface.** Implement Linux + macOS; leave Windows as "unavailable" with a clear logger message. [HIGH: `media-controller.ts:24-27`]
6. **Add the `weather` addon** in the same shape as `media-player`: controller, surface, button, schema, addon registration. Open-Meteo as the primary backend; wttr.in as a documented fallback. [HIGH: `media-player/` layout]
7. **Refactor the emoji-selector `createDecks` for multi-page.** Add prev/next buttons. Update the bundled category examples to demonstrate a 30+ emoji category that *requires* paging. [HIGH: `emoji-selector/index.ts:36-83`]
8. **Add the GitHub Actions matrix workflow.** Per-OS jobs; one of them is the macOS job that runs codesign. Output goes to `/works/test/test-sireno-deck/`. [HIGH: GitHub Actions matrix docs]

Recommended phase ordering: items 1–2 (build/pipeline) come first because they unblock the rest of the milestone; item 4 (system back) is the next-most-invasive because it touches core, schemas, and every addon's config validation; the rest are additive and can land in any order after that.

---

## Integration Points

| Boundary | Current contract | v1.4 guidance |
|----------|------------------|----------------|
| `cli/index.ts` → yargs | yargs subcommands and config flag | No change. The SEA injects this file as the entry; the same yargs surface ships. [HIGH: `cli/index.ts`] |
| `start.ts` → `ensureBrowserRenderer` | returns a `BrowserRenderer` | Wrap the body of `ensureBrowserRenderer` in a Chromium-present check + install. Keep the return type and the rest of the function identical so tests don't change. [HIGH: `start.ts:319-349`] |
| `runtime.ts` → `controller.ts` | uses `goBack`, `navigateTo`, `restoreStack`, `getActiveDeckId` | New `goHome` (or use `restoreStack([mainDeckId])` directly). The system-back button in the runtime calls this on hold. [HIGH: `controller.ts:67-78`] |
| `core/schemas.ts` → config author | `.strict()` schemas with path-aware errors | Add a button-position validation rule that consults the device's `key_count` (or a sensible default). Error path: `decks.<id>.buttons.<i>.position`. [HIGH: `core/schemas.ts:106-180`] |
| `core/schemas.ts` → `addon/registry.ts` | validates each button config against its addon schema | The new validation is *before* the addon schema parse, so it fails fast. [HIGH: `core/schemas.ts:501-603`] |
| `addon/builtin.ts` → registry | hardcoded list of addons | Add `weatherAddon` to the list. [HIGH: `builtin.ts:9-17`] |
| `builtin-addons/date-time/index.ts` → addon registry | exports `builtinCalendarSheetButton` | Already registered. No change to index.ts; only the render function in `calendar-sheet.tsx` is fixed. [HIGH: `date-time/index.ts:24-37`] |
| `builtin-addons/emoji-selector/index.ts` → registry | exports the addon with `createDecks` | The `createDecks` body changes; the addon shape stays the same. [HIGH: `emoji-selector/index.ts:88-95`] |
| `builtin-addons/media-player/index.ts` → registry | exports `mediaPlayerAddon` with one button | Becomes two buttons: `builtinMediaPlayerButton` and `builtinMediaVolumeButton`. [HIGH: `media-player/index.ts:5-9`] |
| `builtin-addons/media-player/domain/*-media-controller.ts` → `media-controller.ts` interface | `getSnapshot`, `togglePlayPause` | Add `getMute`, `setMute`, `getVolume`, `setVolume` to the interface. Update all three OS adapters. [HIGH: `media-controller.ts:24-27`] |
| `theme/schemas.ts` → `media-player` surface | `ThemeMediaPlayerSurface` is themable | Weather gets the same themable surface hook (`ThemeWeatherSurface`). [HIGH: Phase 39 work, `config/theme/schemas.ts`] |
| `addon/api.ts` → mounted button lifecycle | `defineMountedButton`, `useButtonActionCommand` | No change. `media-volume` uses the same `useButtonActionCommand` for tap/hold/double-tap. [HIGH: `api.ts:139-246`] |
| `device/stream-deck.ts` (hardware) → `keyCount` | The runtime's `reservedBackKeyIndex = keyCount - 1` | The runtime now *enforces* the reserved index. The `getReservedBackKeyIndex()` method becomes the *source of truth* for where system back goes, and config validation references the same value. [HIGH: `runtime.ts:1219-1221`] |

---

*Architecture research for: v1.4 standalone distribution + bundled addons + system-reserved back button*
*Researched: 2026-06-04*
*Sources: codebase scan of `packages/cli/src/`, Node SEA docs, Playwright browsers docs, Open-Meteo docs, pactl(1) Debian manpage, osascript SS64 reference, GitHub Actions matrix strategy docs*
