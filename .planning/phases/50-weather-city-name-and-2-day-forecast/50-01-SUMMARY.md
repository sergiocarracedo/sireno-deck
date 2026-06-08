# Plan 50-01 Summary

**Completed:** 2026-06-08

## What was built
Plan 50-01 turned the bundled weather addon into a city-name aware surface. The `location` config now accepts either a string (e.g. `"Vigo, Spain"`) or the existing lat/lon object, and an unknown city surfaces a clear "Location not found" tile instead of silently falling back to IP geolocation. The user sees a "Locating…" tile while the geocoder round trip is in flight, and the controller layer no longer carries the misleading `available: boolean` — it now uses a tri-state `status: 'locating' | 'available' | 'unavailable'`.

## Key files
- `packages/cli/src/builtin-addons/weather/domain/geocoder.ts` (NEW): Open-Meteo Geocoding client with LRU 1000 cache, single-flight, `AbortSignal.timeout(5000)`, and smart country match (`Vigo, Spain` style queries score 100/80/60 with a `country`/`country_code`/`admin1` filter).
- `packages/cli/src/builtin-addons/weather/domain/geocoder.test.ts` (NEW): 12 tests covering cache miss/hit, single-flight, empty query, network 500, empty results, smart country match (Spain / ES / Galicia / Mars no-match), LRU eviction at 1001, and the 5s timeout.
- `packages/cli/src/builtin-addons/weather/schemas.ts`: `location` is now `z.union([z.string().min(1), z.object({latitude, longitude, name?})]).optional()`. `SurfacePageSchema` is a 4-value enum (main / data / hourly-forecast / daily-forecast).
- `packages/cli/src/builtin-addons/weather/domain/weather-controller.ts`: `WeatherSnapshot.available: boolean` is replaced by `status: WeatherSnapshotStatus`. Added `createLocatingWeatherSnapshot()` and replaced `resolveCoordinates` with `resolveLocation(config, options?)` returning a discriminated `WeatherLocation` (`kind: 'coords' | 'name'`). `fetchWeatherSnapshot` no longer calls `fetchIpGeolocation`; a string location that geocodes to nothing returns `status: 'unavailable', source: 'location-not-found'`.
- `packages/cli/src/builtin-addons/weather/domain/weather-controller.test.ts` (NEW): 9 tests covering `resolveLocation` (string / object / empty / unknown city) and `fetchWeatherSnapshot` (success / all-providers-failed / location-not-found) plus snapshot helpers.
- `packages/cli/src/builtin-addons/weather/buttons/weather.tsx`: `onActivate` now sets `createLocatingWeatherSnapshot()` immediately when `config.location` is a string, then awaits the controller. Object-form locations keep the existing fast path.
- `packages/cli/src/builtin-addons/weather/buttons/components/Surface.tsx`: tri-state branch on `snap.status` renders "Locating…", "Location not found" (only when `source === 'location-not-found'`), or "Unavailable" for all other unavailable sources.
- `packages/cli/src/builtin-addons/weather/index.ts`: cast `MountedAddonButtonDefinition` to `SirenoAddon['buttons']` for ZodType variance (matches the date-time addon pattern).
- `packages/cli/src/builtin-addons/weather/buttons/weather.test.tsx`: 2 tests updated to use `page: 'hourly-forecast'`; 3 new tests for the Surface tri-state.

## Decisions made
- **No silent IP fallback** when a string location fails to geocode. The user explicitly asked for a city name, so the only honest response is "Location not found" — falling back to IP would lie about the source of the coordinates. The `use_ip_geolocation` opt-in still works for users who omit `location` entirely.
- **Tri-state `status` over `boolean available`** so the Surface can show a "Locating…" tile during the (potentially 1–5s) geocoder round trip. This is a small UX win: the tile doesn't go blank, the user sees progress.
- **Smart country match** for `Vigo, Spain` style queries rather than always taking the first result. The geocoder splits the query on commas and applies a 100/80/60 score with a hard floor: if a country filter is present and nothing scores ≥ 60, return `null` so `fetchWeatherSnapshot` can produce `location-not-found` rather than geocoding to a different Vigo.
- **LRU 1000 + single-flight** instead of TTL caching. The Open-Meteo Geocoding API has no published cache directives, so a bounded LRU is the simplest correct policy; single-flight prevents the same city being resolved multiple times in parallel (e.g. the first activation plus the first poll).
- **4-value `SurfacePageSchema` even though `daily-forecast` is unwired**. Adding the enum now keeps the schema in sync with the eventual page cycle and means plan 50-02 only has to fill in the renderer.

## Notes for downstream
- `WeatherLocation` is an internal type, not part of the addon manifest contract. It is consumed only by `weather-controller.ts` and downstream renderers. Plan 50-02 will need the `kind: 'name'` variant's `country` and `timezone` if it wants to display them on the daily-forecast page (currently the only consumer is the Surface, which uses `name`).
- The `daily-forecast` page slot in `Surface.tsx`'s `pages` Record is currently a `// TODO(50-02)` placeholder. Plan 50-02 must replace it with the real `<DailyForecast entries={...} />` element.
- The `use_ip_geolocation` config field still works for users who omit `location`. It is no longer the fallback for failed string geocoding. If a future user reports "I typed a city and got my IP", that is a regression in the geocoder, not in the IP fallback path.
- 3 pre-existing test failures in `weather.test.tsx` (location text, humidity percentage, WMO rain icon) were present before v1.5 began; this plan added 24 new tests (12 geocoder + 9 controller + 3 Surface) and introduced 0 new failures.
- The 5s `AbortSignal.timeout` is set on every fetch. A 5000ms timeout is the worst-case geocoder latency; if the network is slower than that, the user sees "Location not found" rather than waiting indefinitely. Bumping the timeout is a config-time decision, not a code change.
