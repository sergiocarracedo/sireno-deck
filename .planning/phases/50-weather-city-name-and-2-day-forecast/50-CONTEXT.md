# Phase 50: Weather city-name + 2-day daily forecast - Context

**Gathered:** 2026-06-08
**Mode:** standard
**Status:** Ready for planning

<domain>

## Phase Boundary

Phase 50 extends the bundled weather addon with two new user-facing capabilities while keeping all existing behavior intact:

1. **City-name configuration.** The `location` config field accepts either a raw string (e.g. `"Vigo, Spain"`) or the existing `{name, latitude, longitude}` object. The string form is resolved to coordinates via the Open-Meteo Geocoding API on first use, with an in-memory LRU cache.
2. **2-day daily forecast page.** A new `daily-forecast` page joins the existing page cycle, showing the next 2 days of daily summaries (high, low, weather icon, precipitation sum) fetched from Open-Meteo's `daily` endpoint in the same `/v1/forecast` call as the current snapshot.

The phase does NOT add: cache persistence, configuration rewriting, per-app 7-day forecasts, city autocomplete, IP geolocation fallback when geocoding fails, or any change to the addon manifest / API surface.

</domain>

<decisions>

## Implementation Decisions

### Schema union (WX-07)

- The user-facing `location` config accepts a raw string **or** the existing `{name, latitude, longitude}` object. The two forms are:
  - `location: "Vigo, Spain"` — string is a city name to geocode
  - `location: {name, latitude, longitude}` — coordinates, unchanged
- The string form has a minimum length of 1 character. Validation is otherwise left to the geocoder (Open-Meteo handles 2-char minimum, fuzzy match, etc.).
- An internal discriminated `WeatherLocation` type normalizes both forms for type-safe controller code:
  - `{kind: 'name', query: string}` — needs geocoding
  - `{kind: 'coords', latitude, longitude, name?: string}` — resolved coordinates
- The "type" field is **internal only**; the public zod schema is a direct `z.union([z.string().min(1), z.object({...})])` without a discriminator.
- Backward compatibility: existing `{name, latitude, longitude}` configs continue to work unchanged. The schema stays `.strict()` on the object form so unknown fields are still rejected.

### Ambiguous match (WX-08)

- When the query string contains a comma (e.g. `"Vigo, Spain"`), apply a **smart country/admin1 match**:
  1. Parse the part after the last comma as the country or admin1 hint.
  2. Among the geocoder results, prefer results where `country` or `admin1` matches the hint (case-insensitive exact match).
  3. If multiple still match, return the first one. If none match, fall back to the first overall result.
- When the query has no comma, return the first result.
- The resolved display name is Open-Meteo's `name` + `country` (e.g. `"Vigo, Spain"`), not the user's original query string. This means `location: "Vigo"` displays as "Vigo, Spain" after geocoding.
- All Open-Meteo Geocoding API requests pass `language=en&count=10` (10 results is more than enough for the smart match; also keeps the response small).

### Geocoding timing (WX-08)

- Replace the existing `available: boolean` on `WeatherSnapshot` with a `status: 'locating' | 'available' | 'unavailable'` enum. The status is the canonical state.
- The geocoder is called **eagerly in `onActivate`** before the first render. If the controller cannot resolve coordinates (network failure or empty geocoder result), the snapshot's `status` is `unavailable` and the `source` field is set to `'location-not-found'`. The UI shows a "Location not found" tile in this case.
- For the first `poll` after activate, the geocoder is not re-called if the in-memory cache already has the resolved coords. Subsequent polls hit the cache and skip the geocoder entirely.
- Cache: in-memory LRU keyed by the normalized lowercase query string, capacity ≥ 1000 entries, no TTL, no persistence. Daemon restart means re-geocoding once per unique city.
- **No fallback to IP geolocation** when geocoding fails. If the user explicitly provides a city name string and the geocoder cannot resolve it, the snapshot is `unavailable` with reason `'location-not-found'`. (The existing IP geolocation path still works when the user does NOT provide a location string and opts in via `use_ip_geolocation: true`.)

### Page cycle (WX2-01)

- New page cycle: `main → data → hourly-forecast → daily-forecast → main`.
- Rename the existing `forecast` page to `hourly-forecast` (internal identifier change). The `SurfacePage` schema enum becomes `['main', 'data', 'hourly-forecast', 'daily-forecast']`.
- The 30-second auto-return to `main` applies to the new `daily-forecast` page, consistent with the existing non-main pages.
- The `daily-forecast` page renders one row per day (2 rows for the 2-day window). Each row shows: day-of-week label (e.g. `"Mon"`, `"Tue"`), WMO weather code icon (reusing `WmoIcon`), high temperature, low temperature, precipitation sum. The exact column layout is agent's discretion within the existing design system.

### Daily forecast HTTP details (WX2-02, WX2-03)

- The `/v1/forecast` call in `open-meteo-client.ts` is extended to include `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum` in the same request that already fetches `current` and `hourly`. **No new HTTP request per poll.**
- The `forecast_days=2` parameter is added. The existing `forecast_days=3` for the hourly section stays (it gives the hourly builder 3 days to stride through).
- `timezone=auto` is already in the existing call; keep it. The 24h daily windows align to local day boundaries thanks to this.
- A new `DailyForecastEntry` interface is added to `weather-controller.ts`:
  ```ts
  interface DailyForecastEntry {
    date: string // ISO local date 'YYYY-MM-DD'
    temperatureMax: number // C
    temperatureMin: number // C
    weatherCode: number
    precipitationSum: number // mm
  }
  ```
- `WeatherSnapshot` gets a `daily: DailyForecastEntry[]` field (always an array; empty when `status !== 'available'`).

### Agent's Discretion

- The internal location of the LRU cache (module-level singleton vs. addon-private). The cache must be shared across all instances of the weather addon in the same daemon process.
- The HTTP client implementation for the geocoder (a thin `fetch` wrapper with a 5s timeout and a single retry on network error is the suggested baseline).
- The exact column layout, font sizes, and spacing of the new `daily-forecast` page within the existing `Surface` design system.
- The day-of-week label format (e.g. `"Mon"` vs `"Monday"` vs `"Tomorrow"`) — agent picks a format consistent with the existing main page (which already uses short labels).
- The exact text of the "Locating…" tile and the "Location not found" tile within the existing `Text` + `tone` system.
- Whether to surface a `parseInt` or `parseFloat` on the precipitation value for display (or just use the raw mm with 1 decimal).
- The rename of the existing `forecast` page identifier in the schema enum: do it in the same commit as the new `daily-forecast` page; do not maintain a `forecast` alias.

</decisions>

<specifics>

## Specific Ideas

- "When the user writes 'Vigo' alone, it should resolve to 'Vigo, Spain' and display that, not 'Vigo'." — captured in the display name decision.
- "The 2-day forecast page should sit AFTER the hourly forecast in the page cycle, not before." — captured in the page order decision.
- "Renaming `forecast` to `hourly-forecast` makes the cycle self-documenting." — captured in the page naming decision.
- "Don't add a 'loading' state if you can avoid it; show real data or honest failure." — partially captured in the geocoding timing decision. The user did choose the hybrid status enum so a 'Locating…' tile is acceptable, but the implementation should be brief and honest, not a fake loading spinner.
- "Keep the existing `{latitude, longitude, name?}` object form working unchanged." — captured in the schema union decision.

No "I want it like X" requests beyond the above.

</specifics>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — `WX-07`, `WX-08`, `WX-09`, `WX-10`, `WX2-01`, `WX2-02`, `WX2-03` (the source of truth for what this phase delivers)
- `.planning/research/STACK.md` — Open-Meteo Geocoding API details
- `.planning/research/ARCHITECTURE.md` — geocoder module shape, `fetchDailyForecast` design, integration with the existing weather controller
- `.planning/research/PITFALLS.md` — geocoder cache miss, `timezone=auto` requirement, daily aggregation boundaries
- `.planning/research/SUMMARY.md` — keystone insights for the milestone
- `packages/cli/src/builtin-addons/weather/schemas.ts` — current `WeatherButtonSchema` and `SurfacePage` enum (this phase extends both)
- `packages/cli/src/builtin-addons/weather/domain/weather-controller.ts` — current `resolveCoordinates`, `fetchWeatherSnapshot`, `WeatherSnapshot`
- `packages/cli/src/builtin-addons/weather/domain/open-meteo-client.ts` — current `/v1/forecast` call signature
- `packages/cli/src/builtin-addons/weather/buttons/weather.tsx` — current page cycle and 30s auto-return logic
- `packages/cli/src/builtin-addons/weather/buttons/components/Forecast.tsx` — the existing hourly forecast component (the new daily component follows the same pattern)
- `packages/cli/src/builtin-addons/weather/buttons/components/Surface.tsx` — the page-driven surface that switches between pages
- `packages/cli/src/builtin-addons/weather/buttons/components/WmoIcon.tsx` — the WMO weather code → icon component (reused by the new daily page)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `WmoIcon` component (`packages/cli/src/builtin-addons/weather/buttons/components/WmoIcon.tsx`): the new daily-forecast page reuses this for the WMO weather code icon. The hourly page already uses it.
- `WeatherSnapshot` interface (`weather-controller.ts:15-24`): the existing shape is mostly preserved; this phase replaces `available: boolean` with `status` and adds `daily: DailyForecastEntry[]`.
- `Text` component (`packages/cli/src/ui`): used by all existing pages for labels, values, and the empty-state. The new daily-forecast page follows the same patterns.
- `unit-conversion` helper (`packages/cli/src/builtin-addons/weather/domain/unit-conversion.ts`): existing `convertTemperature` function is reused for the daily highs/lows.
- The `Surface` component (`packages/cli/src/builtin-addons/weather/buttons/components/Surface.tsx`): drives the page switch in render. The new page is just another case in its switch.

### Established Patterns

- **30-second auto-return to main page** (`weather.tsx:37-56`): the new `daily-forecast` page follows the same `pageChangedAt` + `checkAndResetPageIfNeeded` pattern.
- **`onActivate` + `poll` lifecycle** (`weather.tsx:66-137`): the geocoder is called in `onActivate`; subsequent `poll` calls re-check the cache before re-geocoding.
- **Zod schema in `schemas.ts`**: the `WeatherButtonSchema` is the single source of truth for the config. The new union is added to `location` in place.
- **Snapshot `source` field as a typed reason string**: existing values are `'no-location'`, `'all-providers-failed'`, `'open-meteo'`, `'wttr.in'`. The new `'location-not-found'` reason joins these.
- **Try/catch with "keep last" semantics in `poll`** (`weather.tsx:134-136`): errors during a poll silently keep the last snapshot. The geocoder path uses the same pattern but routes failures to the `unavailable` state on the first resolve.

### Integration Points

- `weather.tsx:24-29` — `getNextPage` needs the new 4-page array and the new page identifiers.
- `weather.tsx:60-61` — `defaultIntervalMs` and `defaultPollIntervalMs` are unchanged.
- `weather-controller.ts:45-61` — `resolveCoordinates` is replaced by a new function that handles both string and object forms and returns the internal `WeatherLocation`.
- `open-meteo-client.ts:50-56` — the URL is extended to include `daily=...&forecast_days=2` (in addition to the existing `forecast_days=3` for hourly).
- `Surface.tsx` — the switch gains a new `case 'daily-forecast'` that renders the new `DailyForecast` component.
- New module: `packages/cli/src/builtin-addons/weather/domain/geocoder.ts` — the geocoder HTTP client and LRU cache. Internal to the weather addon (not a core service).
- New component: `packages/cli/src/builtin-addons/weather/buttons/components/DailyForecast.tsx` — renders the 2-row daily summary.

</code_context>

<deferred>

## Deferred Ideas

- **Persist geocoder cache to disk** — in-memory only per the WX-09 spec. Future candidate.
- **Save resolved coordinates back to the user's config** — would mutate `config.yml`; explicitly out of scope per the v1.5 anti-features.
- **7-day or 14-day daily forecast** — a small extension to the same daily endpoint; future candidate.
- **City autocomplete dropdown** — explicitly out of scope per the v1.5 anti-features (limited display).
- **Configurable fallback chain** (geocode → IP → fail) — the current decision is "no fallback" for the explicit string case. IP fallback stays for the no-location case.
- **Per-button geocoder cache** — the cache is process-wide, shared across all weather buttons. Per-button caching would not gain anything.
- **"Show alternative matches" tile when geocoding returns multiple results** — the smart-match strategy picks one. Surfacing alternatives is a future candidate.

</deferred>

---

*Phase: 50-weather-city-name-and-2-day-forecast*
*Context gathered: 2026-06-08*
