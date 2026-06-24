# Phase 09: Builtin Addons - Context

**Gathered:** 2026-06-24
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the rest of the built-in addon catalog from R7 so the user's existing
`config.yml` validates and renders end-to-end:

1. `date-time` — current time / date / clock surfaces (6 button types)
2. `emoji-selector` — launcher + per-category decks + favorites + pagination
3. `media-player` — single surface + mute / volume buttons
4. `system-status` — cpu / memory / battery with periodic channel publishing
5. `value-display` — renders a value from a subscribed channel
6. `weather` — location-driven (real Open-Meteo fetch + stub fallback)
7. `brightness` — macOS only (real `osascript`); stub on Linux/Windows

Phase 03 already shipped `core-buttons`, `internal-settings`, `session` — those
stay untouched. Phase 07 OS providers supply the media + key-macro plumbing
that media-player and system-status consume.

</domain>

<decisions>
## Implementation Decisions

### Source of truth: legacy implementation
- **Port from `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/`**
  for all 7 addons. Do NOT redesign; copy structure, schemas, button definitions,
  and render code. Adapt:
  - `apiVersion: 1` → `apiVersion: 3` (matches current `SIRENO_ADDON_API_VERSION`)
  - Replace legacy `@/addon/api` types with current `@/addon/api.ts` exports
  - Replace legacy frontend CSS with current theme system imports
  - Replace legacy `frontend.tsx` file pattern with `frontend.main` field
  - Drop legacy `assets:` field references that aren't in v3 manifest

### Date/time (6 buttons)
- Ship the full set from the legacy `date-time` addon:
  `core:date-time`, `core:locked-time-tile`, `core:analog-clock`, `core:clock`,
  `core:date`, `core:time`. The user's `config.yml` uses `type: time`,
  `type: date`, `type: clock` — all three are present.
- Intervals from `schemas.ts` (e.g. `ANALOG_CLOCK_INTERVAL_MS = 1000`,
  `DATE_BUTTON_INTERVAL_MS = 60_000`, `DIGITAL_DATE_TIME_INTERVAL_MS = 1000`)
  become per-button `config.intervalMs` (see system-status below) so users
  can override.

### Media player (3 buttons)
- Ship `core:media-player` (single surface with 5 sub-actions: play/pause,
  next/prev, volume-down/up), plus `core:media-mute` and `core:media-volume`
  as standalone buttons.
- Reuse Phase 07 `createMediaProvider()` to perform play/pause/next/prev/mute/
  volume. Media state subscription (track, playing/paused) drives the
  surface's play/pause indicator.
- The `media-player` button consumes 2 slots (SplitAction), matching the
  Phase 08 surface contract.

### System status (1 button, configurable interval)
- `core:system-status` accepts `config.intervalMs` (default 1000).
- Publishes `system:cpu`, `system:memory`, `system:battery` channels with
  numeric values (0-100 for percentages; raw bytes for memory).
- Uses Phase 03's `ChannelRegistry.instance().publish(channel, value)` directly.
- Internal implementation reads from `os` module (`os.cpus()`, `os.totalmem()`,
  `os.freemem()`, `os.loadavg()`); battery on Linux reads
  `/sys/class/power_supply/BAT0/capacity` (best-effort; ignore on failure).

### Value display (1 button)
- `core:value` accepts `config.channel` (string, required).
- Subscribes to the named channel via `ChannelRegistry.instance().subscribe(...)`
  on mount; renders the latest payload via a `LabelValueList` surface (label
  = channel name; value = `JSON.stringify(payload)` or a configurable
  `format` function — defer the formatter to a simple `text` for v1).

### Weather (1 button)
- `core:weather` accepts `config.location: { latitude, longitude, name? }`.
- Calls Open-Meteo (`https://api.open-meteo.com/v1/forecast`) every
  `config.intervalMs` (default 600_000 = 10 min) — no API key required.
- Renders via `LabelValueList`: temp, wind, weather code → human description.
- If no `config.location` is provided, render a placeholder "Configure weather"
  text. PHASE.md's "no-op stub if no config" interpretation.

### Emoji selector (4 buttons + 1 deck)
- `core:emoji-category-button`, `core:emoji-emoji-button`,
  `core:emoji-launcher-button`, `core:emoji-back-button`.
- One `createDecks` deck definition `core:emoji-selector` that reads
  `config.favorites: string[]` and generates category decks (Favorites first
  when populated, then CATEGORY_DEFINITIONS from legacy).
- Pagination handled by Phase 03's `paginateDecks` + `buildPageNavButton`.
- Page size = `EMOJI_PAGE_SIZE = 32` (carries from legacy).

### Brightness (macOS only)
- `core:brightness` button accepts `config.action: 'up' | 'down' | 'set'`
  and `config.value: number` (0-100, for 'set').
- macOS: shell out to `osascript -e 'tell application "System Events" to key code ...'`
  for up/down; 'set' uses AppleScript brightness control.
- Linux/Windows: render a no-op surface with "Not supported on this platform".
- Stays out of `internal-settings/brightness.ts` (which is the settings-deck
  shortcut) — this is the actual OS brightness controller.

### File layout (per addon)
- `packages/cli/src/builtin-addons/<name>/`
  - `index.ts` — `SirenoAddon` definition; re-exports for tests
  - `schemas.ts` — zod schemas for each button's `config` (if any)
  - `buttons/*.ts(x)` — one file per `AddonButtonTypeDefinition`
  - `__tests__/*.test.ts` — colocated unit tests
- The `internal-settings/brightness.ts` from Phase 03 stays untouched (it's
  the settings-deck shortcut, not an OS controller).

### Integration
- `packages/cli/src/builtin-addons/register-builtins.ts` adds the 7 new addons
  after the existing 3. Order: `core-buttons, internal-settings, session,
  date-time, emoji-selector, media-player, system-status, value-display,
  weather, brightness`.
- The user's `config.yml` already references every button type listed above
  via `type: time`, `type: date`, `type: clock`, `type: weather`,
  `type: emoji-selector`, `type: system-status`, `type: media-player`,
  `type: action` (already Phase 03), `type: change-deck` (already Phase 03).
  All will validate once this phase lands.

### Agent's Discretion
- Exact render surface for each button (IconLabel vs Bars vs LabelValueList
  vs SplitAction) — pick what matches the legacy UI most closely.
- Hex colors / animation timings for the rendering of bars (use Phase 08
  theme tokens, not hardcoded colors).
- Polling backoff strategy when Open-Meteo returns 5xx (simple `setTimeout`
  retry is fine; no exponential backoff needed for v1).
- Whether `core:brightness` ships the macOS real implementation in this phase
  or only the stub — recommended to ship the macOS path because it's the
  user's platform (config.yml targets macOS-style paths) but defer the
  Windows/Linux work to a future phase if time-boxed.

</decisions>

<specifics>
## Specific Ideas

- **"Copy the legacy addon implementation"** — user's verbatim answer for
  date-time, media-player, weather, and the implied default for the rest.
  Port structure + behavior; do not redesign.
- **"Configurable per button"** — user's verbatim answer for system-status
  polling interval. Default 1000 ms; `config.intervalMs` overrides.
- The user's `config.yml` at repo root already uses `type: time`, `type: date`,
  `type: clock`, `type: weather`, `type: emoji-selector`,
  `type: system-status`, `type: media-player`. Once Phase 09 lands, every
  button in that file validates and renders.
- Phase 07 OS providers are wired and ready: `createMediaProvider()`,
  `createActiveAppProvider()`, etc. Phase 09 consumes them.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/09-builtin-addons/09-PHASE.md` — phase scope
- `.planning/PROJECT.md` — R7 (built-in addons) and R8 (gesture state machine)
- `packages/cli/src/builtin-addons/core-buttons/index.ts` — Phase 03 reference pattern
- `packages/cli/src/builtin-addons/register-builtins.ts` — registration site
- `packages/cli/src/addon/api.ts` — `AddonButtonTypeDefinition`, `AddonDeckDefinition`
- `packages/cli/src/addon/api-types.ts` — `SirenoAddon`, `SIRENO_ADDON_API_VERSION = 3`
- `packages/cli/src/themes/default/surfaces/{IconLabel,Bars,LabelValueList,SplitAction}.tsx` — surfaces to render with
- `packages/cli/src/themes/default/components/{Icon,Label,Text,TapIndicator,Chip}.tsx` — primitives
- `packages/cli/src/system/media/` — Phase 07 media provider
- `packages/cli/src/system/provider.ts` — provider interfaces
- `packages/cli/src/core/pagination.ts` — `paginateDecks`, `buildPageNavButton`
- `packages/cli/src/core/pub-sub.ts` — `ChannelRegistry.instance()`

### Legacy source (read-only reference)

- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/date-time/` — 6 buttons, format.ts
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/media-player/` — single surface + mute + volume
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/weather/` — Open-Meteo fetch
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/system-status/` — system status
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/value-display/` — value display
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/emoji-selector/` — emoji + decks
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/brightness/` — macOS brightness
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/core-buttons/` — reference pattern

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ChannelRegistry.instance()` (Phase 03): publish/subscribe for system-status
  and value-display communication between addons.
- `paginateDecks` + `buildPageNavButton` (Phase 03): emoji-selector pagination.
- `createMediaProvider` (Phase 07): media play/pause/next/prev/volume/mute.
- `createActiveAppProvider` (Phase 07): could feed into system-status if we
  want app-specific metrics later; out of scope for v1.
- Phase 08 theme surfaces + primitives: every button renders through these.
- `registerBuiltins()` (Phase 03): add 7 more addon imports + `registry.load()`.

### Established Patterns

- One folder per addon under `packages/cli/src/builtin-addons/<name>/` with
  `index.ts` exporting a `SirenoAddon` (default + named), `schemas.ts` for
  per-button zod configs, `buttons/*.ts(x)` per definition, `__tests__/`
  colocated.
- Legacy `frontend.tsx` pattern doesn't apply in v3; we register button
  `render` functions directly in each button's `AddonButtonTypeDefinition`.

### Integration Points

- `packages/cli/src/builtin-addons/register-builtins.ts` — add 7 lines.
- `packages/cli/src/builtin-addons/index.ts` — add 7 named exports.
- Each addon's `index.ts` is consumed by `registerBuiltins()` via the existing
  Phase 03 pattern.

</code_context>

<deferred>
## Deferred Ideas

- **Windows / Linux brightness control** — Phase 09 ships macOS only;
  Windows/Linux are explicit no-ops. Future phase if needed.
- **Custom formatter for `core:value`** — currently `JSON.stringify(payload)`.
  Defer `format: (payload) => string` config to a future phase.
- **App-specific system-status metrics** — currently generic CPU/RAM/battery.
  Defer active-app-aware metrics (e.g. Spotify currently playing) to a
  future phase.
- **Multiple weather providers** — currently Open-Meteo only. Add
  OpenWeatherMap, wttr.in, etc. when a user requests.
- **Animated theme transitions on weather refresh** — current implementation
  swaps text; no cross-fade.

</deferred>

---

*Phase: 09-builtin-addons*
*Context gathered: 2026-06-24*