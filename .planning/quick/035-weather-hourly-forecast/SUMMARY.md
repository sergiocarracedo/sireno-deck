# Quick Task 035 Summary: Weather hourly forecast

**Status:** Complete
**Date:** 2026-06-05
**Commits:** 3 atomic feature commits

## Goal

Replace the placeholder forecast page in the weather button (which was rendering duplicated wind/humidity info) with a real 6-column hourly forecast showing hour, WMO icon, temperature, and precipitation chance %.

## What Shipped

### Snapshot shape (`weather-controller.ts`)
- New `HourlyForecastEntry` type: `{ time, temperature, weatherCode, precipitationChance }` (always metric, time is 2-digit local hour).
- `WeatherSnapshot` now has `hourly: HourlyForecastEntry[]`.
- `createUnavailableWeatherSnapshot()` returns `hourly: []`.

### open-meteo primary (`open-meteo-client.ts`)
- URL now requests `&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=2&timezone=auto` alongside the existing `current=...`.
- `buildHourlyEntries()` finds the first index whose ISO time is in the future, then walks 6 entries at stride 2 (every 2 hours, ~12h coverage).
- If data runs short (e.g. near end of `forecast_days`), returns fewer entries rather than fabricating. Code path uses `?? 0` defaults to keep the snapshot shape stable.

### wttr.in fallback (`wttr-in-fallback.ts`)
- `buildHourlyEntries()` flattens `weather[0].hourly` + `weather[1].hourly` (today + tomorrow).
- Parses `time` like `"300"` → hour 3, pairs with `day.date` for an absolute timestamp.
- Filters to future entries, sorts ascending, takes first 6 at wttr.in's **native 3h cadence** (~18h coverage on fallback).
- Reuses existing `mapWttrCodeToWmo()` for code translation — no new mapping tables.

### Forecast UI (`components/Forecast.tsx` + `Surface.tsx`)
- New `Forecast` component: 6 horizontal columns, each rendering hour label, `WmoIcon size={14}`, converted temperature (via existing `convertTemperature` helper, no unit suffix to save space), and `XX%` precipitation.
- Empty `hourly` → centered `No forecast` placeholder.
- `Surface.tsx` forecast page now delegates to `Forecast` and no longer shows the wind/humidity placeholder.

### Tests (`weather.test.tsx`)
- `availableSnapshot` fixture gets `hourly: []` to satisfy the new required type field.
- Two new tests:
  - `renders the forecast page placeholder when hourly is empty` — page `forecast`, empty hourly → contains `No forecast`.
  - `renders hour labels and converted temperatures on the forecast page` — 3 entries, asserts presence of `14`, `16`, `18`, `23`, and `10%`.

## Decisions (locked in CONTEXT.md)

| Area | Choice | Note |
| --- | --- | --- |
| Hours | 6 | Fits 96x96 comfortably as horizontal columns. |
| Cadence (open-meteo) | 2h | Max detail within `forecast_days=2`. |
| Cadence (wttr.in) | 3h (native) | Honest signal; refused to interpolate, would fabricate data. |
| Per hour | hour + icon + temp + precip % | All four items requested. |
| Layout | 6 horizontal columns | Reads L-to-R, top-to-bottom per column. |
| Fallback | Fetch from wttr.in too | Honoring user choice. |

## Cadence Asymmetry

The forecast page may show entries 2h apart (open-meteo) or 3h apart (wttr.in). This is **intentional**, not a bug — preserving real-world signal over visual consistency. The `Surface.tsx` page does not need to know the source. A future task could surface the source on the forecast page if the user wants a hint.

## Verification

- `pnpm -C packages/cli exec vitest run weather` → 12 passing, 3 failing (all 3 failures pre-date this task: `Weather` vs `Unavailable` label, and `page` default mismatch on the `data` page tests).
- 2 new forecast tests pass.
- `oxlint` clean on the weather addon.
- `tsc --noEmit` only shows pre-existing API drift errors (e.g. `weather/index.ts:7` `MountedAddonButtonDefinition` vs `AddonButtonDefinition` — pre-existing, not introduced here).
- Visual sanity deferred to the next manual run on a real deck (no headless rendering test was added beyond DOM-host HTML).

## Files Touched (atomic commits)

1. `weather-controller.ts`, `open-meteo-client.ts` — commit `1738536`
2. `wttr-in-fallback.ts` — commit `1539b71`
3. `Forecast.tsx` (new), `Surface.tsx`, `weather.test.tsx` — commit `15dea99`
4. **Fix:** `open-meteo-client.ts`, `weather.test.tsx` — commit `bb17c56` (always return 6 entries)

## Followup Fix: 6-Column Guarantee

After ship, the runtime was returning only 3 columns when the next future hour sat late in the open-meteo hourly window (e.g. querying a location ~18-24h into the data set). Root cause: stride-2 walker broke out of bounds and stopped early.

Resolution:
- Bumped `forecast_days` from 2 to 3 (72 hours of headroom).
- `buildHourlyEntries` now falls back to stride 1 when fewer than 12 future slots remain, so the page always renders 6 columns wherever the source has data.
- Test fixture updated from 3 to 6 entries so the test mirrors production.
- Cadence asymmetry still intentional between providers (2h primary vs 3h fallback); the new fallback is within-stride, not between-provider.

## Out of Scope (deferred)

- Configurable hours / cadence knobs.
- Multi-day forecast.
- Source badge on the forecast page.
- Fixing the 3 pre-existing weather test failures (kept surgical per Principle 2).
