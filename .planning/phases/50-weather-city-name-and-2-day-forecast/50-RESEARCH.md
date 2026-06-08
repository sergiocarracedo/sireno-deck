# Phase 50: Weather city-name + 2-day daily forecast - Research

**Gathered:** 2026-06-08
**Mode:** sequential (no subagent; inline)
**Confidence:** HIGH overall. New surface is small (one HTTP API, one new component, one schema change). Architecture is evolution of existing seams.

## Don't Hand-Roll

| Problem | Don't | Use |
|---------|-------|-----|
| City name → coordinates | Build a geocoder with custom index/database | **Open-Meteo Geocoding API** (`geocoding-api.open-meteo.com/v1/search`). Free, no key, no rate limit for non-commercial use, results localized to `language` parameter. |
| LRU cache for geocoder hits | Hand-roll a `Map` with custom eviction | A simple `Map` with a size guard is enough at this scale (≤ 1000 entries). No need for a library. |
| Snapshot state machine | Three booleans (`isLoading`, `isError`, `isReady`) | A single `status: 'locating' \| 'available' \| 'unavailable'` enum. Reduces invalid state combinations. |
| Discriminated union type for the controller | `as` casts on the parsed config | Internal `WeatherLocation` type with a `kind: 'name' \| 'coords'` discriminator. zod's `.transform()` to normalize. |
| Smart country match | Post-filter 10 results in JS to match country/admin1 | Use Open-Meteo's built-in `countryCode` URL parameter when the user wrote "City, Country" AND the country is one of a small allow-list. Fall back to post-filter otherwise. |

## Common Pitfalls

| Pitfall | Why it happens | Prevention |
|---------|----------------|------------|
| `forecast_days=2` without `timezone=auto` | Default timezone is GMT; daily windows start at UTC midnight, not local midnight | The existing call already passes `timezone=auto`. **Keep it** when adding `daily=`. |
| Geocoder request storm on every poll | If the geocoder is called on every poll, you'll hit Open-Meteo's geocoder unnecessarily | Geocoder is called only in `onActivate` and when the in-memory cache misses. The poll path uses cached coords. |
| Race condition: poll fires before geocode completes | `onActivate` is async; `poll` might fire first | The snapshot is set to `status: 'locating'` synchronously in `onActivate`. The first poll returns the same `locating` state until geocoding completes. Subsequent polls after success use the cached coords. |
| 2-char exact-match in Open-Meteo | The geocoder requires 2 chars for exact match, 3+ for fuzzy | Validate `query.length >= 2` before calling. If 1 char, fail fast with `'location-not-found'`. |
| Country name spelling variations | "Spain" vs "España" vs "ES" — users might write any of them | The smart-match uses case-insensitive substring match against `country` and `admin1` fields. We do NOT need a country-name → ISO code map. |
| `population` is 0 for small towns | Open-Meteo returns `population: 0` for many small results | Do NOT use `population` for ranking; the API's default ordering is already by relevance. |
| WMO code → icon mismatch | Daily and hourly use the same WMO code mapping | Reuse the existing `WmoIcon` component for both pages. |
| Daemon restart re-geocodes every city | The cache is in-memory only per WX-09 | Document this behavior. Do not add disk persistence in v1.5. |
| Geocoder call has no timeout | `fetch` will hang if Open-Meteo is unreachable | Wrap in `AbortSignal.timeout(5000)` (Node 20+ native). Catch the abort and return `'location-not-found'`. |
| `language=en` not passed explicitly | Default is `en` but the API may change defaults | Always pass `language=en&count=10` explicitly. |

## Existing Patterns in This Codebase

| Pattern | Where | How it constrains/enables this phase |
|---------|-------|---------------------------------------|
| `WeatherButtonSchema` is zod-based, `.strict()` | `packages/cli/src/builtin-addons/weather/schemas.ts:3-17` | The new union goes in `location` directly. The object form stays `.strict()`. |
| `WeatherSnapshot` is the single source of truth for render state | `packages/cli/src/builtin-addons/weather/domain/weather-controller.ts:15-24` | Replace `available: boolean` with `status` enum. Add `daily: DailyForecastEntry[]`. |
| Page cycle is hard-coded in `getNextPage` | `packages/cli/src/builtin-addons/weather/buttons/weather.tsx:24-29` | Update the array to `['main', 'data', 'hourly-forecast', 'daily-forecast']`. |
| 30s auto-return is a function of `pageChangedAt` | `packages/cli/src/builtin-addons/weather/buttons/weather.tsx:37-56` | New `daily-forecast` page uses the same pattern. |
| `Surface` component dispatches on `page` prop | `packages/cli/src/builtin-addons/weather/buttons/components/Surface.tsx` | Add a `case 'daily-forecast'` rendering the new `DailyForecast` component. |
| `WmoIcon` is the canonical weather icon | `packages/cli/src/builtin-addons/weather/buttons/components/WmoIcon.tsx` | Reuse for the daily page. |
| `unit-conversion.convertTemperature` is the canonical unit transform | `packages/cli/src/builtin-addons/weather/domain/unit-conversion.ts` | Reuse for daily highs/lows. |
| The existing `/v1/forecast` call uses `forecast_days=3` and `timezone=auto` | `packages/cli/src/builtin-addons/weather/domain/open-meteo-client.ts:50-56` | Extend the URL with `daily=...&forecast_days=2`. The existing `forecast_days=3` for hourly can stay (it gives the hourly builder 3 days to stride through). |
| Try/catch with "keep last" semantics in `poll` | `packages/cli/src/builtin-addons/weather/buttons/weather.tsx:134-136` | The new geocoder path uses a similar try/catch but routes failures to `unavailable` on the first resolve. |
| `onActivate` and `poll` both call `createWeatherController` separately | `packages/cli/src/builtin-addons/weather/buttons/weather.tsx:70-79,114-122` | This is fine. The geocoder is called inside `fetchWeatherSnapshot` only when the controller's internal cache misses. |
| Existing IP geolocation fallback when no location is provided | `packages/cli/src/builtin-addons/weather/domain/weather-controller.ts:57-59` | This stays unchanged. The new string-location path does NOT fall back to IP. |

## Recommended Approach

### Plan 50-01: City-name geocoding + status enum (tracer bullet)

Vertical slice: a button with `location: "Vigo, Spain"` shows correct weather on first render, and a button with `location: "GarbageCityName"` shows the honest "Location not found" state.

Tasks (high level):
1. Add `geocoder.ts` module: `fetchGeocodeResults(query)`, `pickBestMatch(results, query)` with smart country/admin1 post-filter, and a process-wide LRU cache (Map with size guard, capacity 1000, normalized lowercase key).
2. Replace the zod `location` field with a union: `z.union([z.string().min(1), z.object({latitude, longitude, name?})])`. Add an internal `WeatherLocation` discriminated type and a small `parseLocation(config)` function that normalizes both forms.
3. Update `resolveCoordinates` in `weather-controller.ts` to handle the new normalized form: string → geocode (LRU-cached) → coords; object → coords directly. No IP fallback for the string case.
4. Replace `available: boolean` with `status: 'locating' | 'available' | 'unavailable'` on `WeatherSnapshot`. Set `'locating'` synchronously in `onActivate`; resolve to `'available'` or `'unavailable'` after geocoding.
5. Update `Surface` to render a "Locating…" tile when `status === 'locating'`, and a "Location not found" tile when `status === 'unavailable' && source === 'location-not-found'`.
6. Tests: geocoder cache miss → hit, invalid city name → 'location-not-found', smart country match for "Vigo, Spain" vs "Vigo, Italy", no IP fallback when geocoding fails.

### Plan 50-02: 2-day daily forecast page (tracer bullet)

Vertical slice: a button with valid coords shows a new 4th page in the cycle that renders the next 2 days with high/low, WMO icon, and precipitation sum.

Tasks (high level):
1. Add `DailyForecastEntry` interface to `weather-controller.ts`. Add `daily: DailyForecastEntry[]` to `WeatherSnapshot` (always an array; empty when `status !== 'available'`).
2. Extend `open-meteo-client.ts` URL: add `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&forecast_days=2` to the existing `/v1/forecast` call. The existing `forecast_days=3` for hourly can stay.
3. Add a `buildDailyEntries(daily)` helper in `open-meteo-client.ts` that maps the parallel arrays into `DailyForecastEntry[]`. Each entry's `date` is the local ISO date from the daily `time` array.
4. Rename `forecast` → `hourly-forecast` in the `SurfacePage` zod enum. Update `weather.tsx`'s `getNextPage` and `pages` array to `['main', 'data', 'hourly-forecast', 'daily-forecast']`.
5. Add `DailyForecast.tsx` component: renders one column per day (2 columns for the 2-day window) with day label, WMO icon, high, low, precip sum. Reuse `WmoIcon`, `Text`, and `unit-conversion`.
6. Add a `case 'daily-forecast'` to the `Surface` switch.
7. Tests: `buildDailyEntries` produces 2 entries with correct mapping; `daily-forecast` page renders without error when data is present; `daily-forecast` page renders the empty state when daily array is empty.

### Build order

Plan 50-01 first, then 50-02. Plan 50-01 establishes the new data plumbing (geocoder, status enum, normalized location); Plan 50-02 builds on that plumbing.

## New API Details (verified 2026-06-08 via open-meteo.com/en/docs)

- **Geocoding URL:** `https://geocoding-api.open-meteo.com/v1/search?name={query}&count=10&language=en&format=json`
- **Optional `countryCode` filter:** ISO-3166-1 alpha2 (e.g. `ES` for Spain). The API filters server-side. We do NOT need this for the smart-match approach, but it's available if we want to optimize later.
- **Result fields used:** `id`, `name`, `latitude`, `longitude`, `country`, `admin1`, `timezone`, `population`.
- **Min query length:** 2 chars for exact, 3+ for fuzzy. We pass through whatever the user wrote.
- **Daily URL extension:** `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&forecast_days=2`
- **Daily variables available (subset):** `temperature_2m_max`, `temperature_2m_min`, `temperature_2m_mean`, `apparent_temperature_max`, `apparent_temperature_min`, `precipitation_sum`, `rain_sum`, `showers_sum`, `snowfall_sum`, `precipitation_hours`, `precipitation_probability_max`, `weather_code`, `sunrise`, `sunset`, `daylight_duration`, `sunshine_duration`, `wind_speed_10m_max`, `wind_gusts_10m_max`, `wind_direction_10m_dominant`, `shortwave_radiation_sum`, `uv_index_max`.
- **WMO codes 0-99** with the documented mapping (existing code uses the same).
- **HTTP errors:** 400 with `{error: true, reason: "..."}` body on bad parameters.

## Confidence Levels

| Area | Confidence | Notes |
|------|------------|-------|
| Open-Meteo API contract | HIGH | Verified live 2026-06-08. |
| zod union + transform | HIGH | Standard pattern. |
| LRU cache at 1000 entries | HIGH | In-memory Map with size guard is sufficient. |
| `fetch` + `AbortSignal.timeout(5000)` | HIGH | Node 20+ native. The project's package.json targets Node 20 LTS. |
| Surface component extension | HIGH | Existing component follows the switch-on-page pattern. |
| Smart country match implementation | MEDIUM | The approach is sound but the exact post-filter logic deserves a unit test with edge cases ("Vigo, Pontevedra" — admin1 vs country). |
| Daily forecast layout in 2 columns | MEDIUM | Layout choice is agent's discretion. 2 columns fits the existing button's aspect ratio. |

## Canonical References (downstream MUST read)

- `.planning/REQUIREMENTS.md` (WX-07..10, WX2-01..03)
- `.planning/research/STACK.md` (Open-Meteo API overview)
- `.planning/research/ARCHITECTURE.md` (geocoder module shape, daily forecast design)
- `.planning/research/PITFALLS.md` (geocoder cache miss, `timezone=auto`)
- `.planning/research/SUMMARY.md` (v1.5 keystone insights)
- `.planning/phases/50-weather-city-name-and-2-day-forecast/50-CONTEXT.md` (user decisions)
- `packages/cli/src/builtin-addons/weather/` (existing addon)
- `.planning/codebase/ARCHITECTURE.md` (addon rendering model, page cycles)

---

*Research gathered: 2026-06-08*
*Supplements the v1.5 milestone research at `.planning/research/` (gathered 2026-06-07).*
