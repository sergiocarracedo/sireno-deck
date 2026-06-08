---
plan: 50-02
phase: 50
title: 2-day daily forecast page
status: complete
completed_at: 2026-06-08
---

# Plan 50-02: 2-day daily forecast page

## Objective

A weather button now has a fourth page, `daily-forecast`, that renders a 2-day
summary with a day label, a WMO weather icon, a high temperature, a low
temperature, and a precipitation sum per day. The page cycle is
`main → data → hourly-forecast → daily-forecast → main`, and the existing
30-second auto-return behavior is preserved.

## What was built

### Type and snapshot extension
- `DailyForecastEntry` is a new interface in `weather-controller.ts`
  (`{ date, weatherCode, tempMax, tempMin, precipitationSum }`).
- `WeatherSnapshot.daily: DailyForecastEntry[]` is now a non-optional field.
- `createLocatingWeatherSnapshot` and `createUnavailableWeatherSnapshot`
  return `daily: []`; the wttr.in fallback returns `daily: []` (wttr has
  no daily data).

### Open-Meteo client
- The forecast URL adds
  `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum`
  while keeping `forecast_days=3` (the 3-day window still feeds the hourly
  page; the daily window is sliced to 2 in the builder).
- `buildDailyEntries(daily)` returns at most 2 entries and tolerates
  missing or empty API responses.

### Page cycle
- `getNextPage` now cycles through the 4-value array
  `['main', 'data', 'hourly-forecast', 'daily-forecast']`. The function is
  exported and tested directly.

### DailyForecast component
- New `DailyForecast.tsx` renders one column per `DailyForecastEntry`:
  - Day label (primary tone, derived from `new Date('${isoDate}T12:00:00Z').getUTCDay()`)
  - `WmoIcon` size 14
  - High temperature (primary tone)
  - Low temperature (foreground tone)
  - Precipitation sum in mm (foreground tone, rounded to integer)
- Empty `entries` → "No daily forecast" centered tile (same UX as `Forecast`).
- The page key in `Surface.tsx` was renamed from `forecast:` to
  `hourly-forecast:` (with a comment), and `daily-forecast:` dispatches
  to the new `DailyForecast` component.

## Key files

- `packages/cli/src/builtin-addons/weather/domain/weather-controller.ts`
  — added `DailyForecastEntry`; `WeatherSnapshot.daily` non-optional.
- `packages/cli/src/builtin-addons/weather/domain/open-meteo-client.ts`
  — added `OpenMeteoDaily`, `buildDailyEntries`, daily URL param, parser.
- `packages/cli/src/builtin-addons/weather/domain/open-meteo-client.test.ts`
  — NEW: 3 tests for daily parsing.
- `packages/cli/src/builtin-addons/weather/buttons/weather.tsx`
  — `getNextPage` is now exported.
- `packages/cli/src/builtin-addons/weather/buttons/weather.test.tsx`
  — added `describe('getNextPage')` cycle test.
- `packages/cli/src/builtin-addons/weather/buttons/components/DailyForecast.tsx`
  — NEW component.
- `packages/cli/src/builtin-addons/weather/buttons/components/DailyForecast.test.tsx`
  — NEW: 4 tests (empty, 2-entry render, imperial units, precip sum).
- `packages/cli/src/builtin-addons/weather/buttons/components/Surface.tsx`
  — imported `DailyForecast`; renamed `forecast:` → `hourly-forecast:`;
  added `daily-forecast:` page.

## Decisions made

- **Keep `forecast_days=3` in the URL.** The hourly window is 3 days; the
  daily window is 2 days. Slicing the daily response in the builder (rather
  than trimming the URL) keeps the data fetched identical for both consumers.
- **Keep the `Forecast.tsx` file name.** The file is now the renderer for
  the `hourly-forecast` page; renaming the file would create churn with
  imports and tests. The page key rename in `pages` Record is enough.
- **Empty daily tiles say "No daily forecast".** Consistent with the
  `Forecast` component's "No forecast" tile. Pre-existing convention.
- **`formatDayLabel` uses noon-UTC parsing.** The `YYYY-MM-DD` strings from
  Open-Meteo are anchored at noon UTC so any timezone difference between
  the host and the API is invisible to the user.

## Test results

| File                                       | Tests | Pass | Fail (baseline) |
|--------------------------------------------|------:|-----:|----------------:|
| `geocoder.test.ts`                         |    12 |   12 |               0 |
| `weather-controller.test.ts`               |     9 |    9 |               0 |
| `weather.test.tsx` (existing + new)        |    12 |    9 |               3 |
| `open-meteo-client.test.ts`                |     3 |    3 |               0 |
| `DailyForecast.test.tsx`                   |     4 |    4 |               0 |
| `unit-conversion.test.ts`                  |     6 |    6 |               0 |
| `ip-geolocation.test.ts` (untouched)       |     0 |    0 |               0 |
| **Total**                                  |   **46** | **43** |           **3** |

The 3 pre-existing baseline failures (location text on main page, humidity
percentage on data page, WMO icon rain code) are unchanged from before
v1.5. They are not regressions caused by this work.

## Notes for downstream

- `wttr-in-fallback` always returns `daily: []`. The wttr.in API does not
  expose daily data; the daily-forecast page will show "No daily forecast"
  when the only working provider is wttr.in. This is acceptable per the
  CONTEXT decision that Open-Meteo is the primary provider and the only
  one with the daily window we need.
- The `daily-forecast` page is added to the 30-second auto-return timer
  the same way the other pages are (no special handling needed). Phase 50
  ships the v1 of this tile; a follow-up could add a third day if the
  product wants a longer horizon.

## Commits

- `9d855d2` — feat(50-02): add DailyForecastEntry type and daily field to WeatherSnapshot
- `7323da1` — feat(50-02): fetch and parse daily forecast in open-meteo client
- `9a2b7ff` — test(50-02): cover the 4-value page cycle in getNextPage
- `865d1b5` — feat(50-02): add DailyForecast component and wire it into Surface
