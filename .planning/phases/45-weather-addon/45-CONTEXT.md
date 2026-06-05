# Phase 45: Weather Addon - Context

**Gathered:** 2026-06-04
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

New bundled `weather` addon mirroring the media-player addon shape: controller + surface + button + schema + addon registration. Open-Meteo as the primary backend (no API key, WMO codes), wttr.in as the fallback. Configurable `units: 'metric' | 'imperial'`, optional `location: { latitude, longitude, name }`, opt-in IP geolocation via `use_ip_geolocation: true`. Render shows 4 fields: WMO icon, temperature, location name, and a compact wind/humidity row. 10-minute refresh cadence. Honest "not available" state with `unavailable_label` config.

</domain>

<decisions>
## Implementation Decisions

### Location resolution
- Read `location: { latitude, longitude, name }` from config first
- If absent, check `use_ip_geolocation: true`; if set, fetch from `ipapi.co/json/`
- If neither, the button shows the unavailable state with `unavailable_label` (default "Weather")
- IP geolocation is opt-in only (no surprise privacy leak)
- `name` from IP geolocation is filled from the IP's city/country fields

### Render (4 fields)
- Top: WMO weather icon (Lucide name from code map) — accent tone
- Middle: temperature (large, primary tone) — e.g., "24°"
- Bottom-left: location name (small, foreground tone) — e.g., "LONDON"
- Bottom-right: compact wind/humidity (small, foreground tone) — e.g., "12km/h 65%"

### Backend cascade
- Try Open-Meteo first (`https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&temperature_unit=celsius|fahrenheit`)
- On network error or parse error, fall through to wttr.in (`https://wttr.in/{lat},{lon}?format=j1`)
- Both return the same `WeatherSnapshot` shape (temperature, weatherCode, windSpeed, humidity, location)

### Schema
- `BuiltinWeatherButtonSchema` accepts:
  - `units: 'metric' | 'imperial'` (default `'metric'`)
  - `location: { latitude, longitude, name? } | undefined`
  - `use_ip_geolocation: boolean | undefined`
  - `unavailable_label: string` (default `'Weather'`)
  - `poll_interval_ms: number` (default 600_000 = 10 min)
  - `render_interval_ms: number` (default 600_000)

### Controller shape
- `WeatherController` interface mirrors `MediaController`: `getSnapshot(): Promise<WeatherSnapshot>`
- `WeatherSnapshot`: `{ available, temperature, weatherCode, windSpeed, humidity, location, source, errorMessage? }`
- `createWeatherController({ hostContext, config })` returns the right Open-Meteo client
- No OS-specific adapters (the work is HTTP)

### Addon structure (mirroring media-player)
- `packages/cli/src/builtin-addons/weather/`
  - `domain/weather-controller.ts` (interface + factory)
  - `domain/open-meteo-client.ts` (Open-Meteo fetch)
  - `domain/wttr-in-fallback.ts` (wttr.in fetch)
  - `domain/ip-geolocation.ts` (ipapi.co)
  - `components/WmoIcon.tsx` (WMO code → Lucide icon name)
  - `components/Surface.tsx` (4-field render)
  - `schemas.ts` (BuiltinWeatherButtonSchema)
  - `buttons/weather.tsx` (defineMountedButton)
  - `index.ts` (register the addon)

### Agent's Discretion
- Exact `Text` size and tone for each field
- Spacing between rows
- Whether to round temperature to integer or show decimal
- Wind speed unit display (km/h vs mph based on `units` config)
- Whether the IP geolocation cache (in-memory or filesystem)

</decisions>

<specifics>
## Specific Ideas

- **4 fields** is more than the milestone image (which showed 3), but the user explicitly chose all 4 — wind/humidity is useful info and fits in the bottom row
- **Open-Meteo as primary** matches the v1.4 research decision (free, no key, WMO codes, geocoding)
- **wttr.in fallback** is documented in the research for users behind firewalls that block Open-Meteo
- **IP geolocation opt-in** is the privacy-conscious default — the milestone explicitly chose "opt-in" in the v1.4 research
- **10-minute refresh** matches the research and weather's actual update frequency on the API side

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/.planning/research/v1.4/STACK.md`
- `/works/opensource/sireno-deck/.planning/research/v1.4/FEATURES.md` — WMO code icon map, units config, IP geolocation
- `/works/opensource/sireno-deck/.planning/research/v1.4/ARCHITECTURE.md` — "Weather addon" section, `createWeatherController` flow
- `/works/opensource/sireno-deck/.planning/research/v1.4/PITFALLS.md`
- `/works/opensource/sireno-deck/.planning/REQUIREMENTS.md` — `WX-01` through `WX-06`
- `/works/opensource/sireno-deck/.planning/phases/45-weather-addon/...` (this file)
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/media-player/` — pattern reference for addon structure
- `/works/opensource/sireno-deck/packages/cli/src/ui/Icon.tsx` — `Icon` component with Lucide name resolution
- `/works/opensource/sireno-deck/packages/cli/src/ui/Text.tsx` — `Text` component
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/media-player/media-player-button.tsx` — pattern for the button file

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets
- **`Icon` component** at `ui/Icon.tsx` — accepts Lucide icon name string, resolves to the component
- **`Text` component** at `ui/Text.tsx` — supports `size`, `tone`, `typography`, `fit`
- **`defineMountedButton`** at `addon/api.ts` — the standard button authoring seam
- **`execa`** dep — for HTTP fetch via `fetch` is fine, but `execa` is the existing pattern in this codebase
- **media-player addon shape** — controller, surface, button, schema, addon registration, all in one folder

### Established Patterns
- **Built-in addons live in `packages/cli/src/builtin-addons/{name}/`** with the standard structure
- **Controllers return `Snapshot` objects with an `available` field** for honest unavailable state
- **Bundled registration in `index.ts`** exports a `SirenoAddon` default

### Integration Points
- **`packages/cli/src/builtin-addons/weather/index.ts`** — new addon registration
- **`packages/cli/src/config/loader.ts`** (or wherever bundled addons are loaded) — needs to load the new `weather` addon
- **`theme presentation seam`** — themable Surface component (the Surface contract from Phase 39)

</code_context>

<deferred>
## Deferred Ideas

- Weather forecast (multi-day) — out of scope; current is current-condition only
- Weather alerts / severe weather notifications — out of scope
- Configurable temperature unit (C/F) per user (handled by `units` config) — already in scope
- Weather-driven actions (e.g., auto-toggle theme based on weather) — out of scope, theme choice is separate

</deferred>

---
*Phase: 45-weather-addon*
*Context gathered: 2026-06-04*
