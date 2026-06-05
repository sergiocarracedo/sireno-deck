# Plan 45-01 Summary

**Completed:** 2026-06-04

## What was built

A new bundled `weather` addon that mirrors the media-player shape: a `WeatherController` + `WeatherSnapshot` interface, an Open-Meteo HTTP client, a wttr.in fallback, an ipapi.co IP geolocation helper, a `WmoIcon` component that maps 27 WMO codes to Lucide icon names, and a `Surface` component that renders 4 fields (WMO icon, temperature, location, wind/humidity). The bundled `weather` button is registered in the addon registry. 8 tests pass (6 render + 2 index).

## Key files

- `packages/cli/src/builtin-addons/weather/schemas.ts` — `WeatherButtonSchema` (units, location, use_ip_geolocation, unavailable_label, poll/render_interval_ms)
- `packages/cli/src/builtin-addons/weather/domain/weather-controller.ts` — `WeatherSnapshot`, `WeatherController` interface, `createWeatherController` factory, `fetchWeatherSnapshot` orchestrator with location resolution and provider cascade
- `packages/cli/src/builtin-addons/weather/domain/open-meteo-client.ts` — Open-Meteo fetch
- `packages/cli/src/builtin-addons/weather/domain/wttr-in-fallback.ts` — wttr.in j1 fetch + WMO code mapping table
- `packages/cli/src/builtin-addons/weather/domain/ip-geolocation.ts` — ipapi.co JSON fetch
- `packages/cli/src/builtin-addons/weather/components/WmoIcon.tsx` — 27-code WMO → Lucide name map
- `packages/cli/src/builtin-addons/weather/components/Surface.tsx` — 4-field render
- `packages/cli/src/builtin-addons/weather/buttons/weather.tsx` — `builtinWeatherButton` with poll + render
- `packages/cli/src/builtin-addons/weather/index.ts` — registers the addon
- `packages/cli/src/builtin-addons/weather/buttons/weather.test.tsx` — 6 render tests
- `packages/cli/src/builtin-addons/weather/index.test.ts` — 2 addon index tests
- `packages/cli/src/addon/builtin.ts` — adds `weatherAddon` to `getBundledAddons()`

## Decisions made

- **Wind unit display:** `km/h` for Open-Meteo, `mph` for wttr.in (mapped from `source` field)
- **WMO from wttr.in:** Used a mapping table of 56 wttr.in weather codes → WMO codes (covering the most common conditions)
- **Coordinate resolution:** `config.location` first, then `fetchIpGeolocation()` if `use_ip_geolocation: true`, otherwise unavailable
- **Provider cascade:** Open-Meteo first, wttr.in on error, unavailable snapshot on both failing
- **10-minute default refresh** matches the v1.4 research cadence

## Notes for downstream

- The IP geolocation helper is called by `fetchWeatherSnapshot` (not by the button) — keeps the button simple
- 8 tests pass total (6 render + 2 index)
- Pre-existing test failures in `theme.test.ts` and other files (documented in `39-01-SUMMARY.md`) are not introduced by Phase 45
