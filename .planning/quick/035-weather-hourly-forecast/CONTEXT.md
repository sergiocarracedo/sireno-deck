# Quick Task 035: Weather hourly forecast - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Task Boundary

Extend the existing weather button so its `forecast` page (already part of `SurfacePage`) displays a real hourly forecast pulled from the weather provider, instead of the current placeholder that re-renders wind/humidity.

In scope:
- Extend `WeatherSnapshot` with an `hourly` array (always in metric).
- Extend `open-meteo` client to request `hourly` data and pick the next 6 entries at 2-hour cadence.
- Extend `wttr.in` fallback to expose 6 forecast entries from its native 3-hourly array.
- Redesign the forecast page in `Surface.tsx` as 6 horizontal columns (`hour / icon / temp / precip%`), using `convertTemperature` for the displayed value.
- Update tests (controller, providers, surface forecast page rendering).

Out of scope:
- New polling/render cadence (reuse existing).
- New WMO icon mappings (use existing `WmoIcon`).
- Multi-day forecast or longer ranges.
- New config knobs (hours/cadence are fixed; can be revisited later).

</domain>

<decisions>
## Implementation Decisions

### Hours count
- 6 forecast entries per render.

### Cadence between hours
- Open-Meteo: every 2 hours.
- wttr.in fallback: every 3 hours (its **native** cadence — 8 entries/day at `0/300/600/900/1200/1500/1800/2100`). We do **not** interpolate to fake a 2h cadence; that would fabricate data. Honest signal wins. Net effect: primary covers ~12h, fallback covers ~18h. Both show 6 columns.

### Data per hour
- Hour label (e.g. `14`), WMO weather icon, temperature (converted via existing `convertTemperature`), precipitation chance (`%`).

### Layout
- 6 horizontal columns inside the forecast page. Per column, top-to-bottom: hour / icon / temp / precip%.
- Total surface stays 96x96. Text uses smallest size token (`xs`); icons sized small (~12px) to fit 6-wide.

### wttr.in fallback behavior
- Yes — fetch hourly forecast from wttr.in too, using its native 3h cadence. We pick the next 6 entries starting from the current local hour, walking forward through `weather[].hourly[]`.

### Snapshot shape
- `WeatherSnapshot.hourly` is always metric: `{ time: string (ISO or 'HH'), temperature: number /*°C*/, weatherCode: number, precipitationChance: number /* 0-100 */ }[]`.
- `createUnavailableWeatherSnapshot` returns `hourly: []`.

### Agent's Discretion
- Exact CSS for the 6-column layout (sizes, gaps, font tokens).
- Whether to pad missing entries (e.g. open-meteo returning <6 future entries near end-of-day) — preferred: show as many as available, do not fabricate.
- Time label format: 2-digit 24h (`14`, `16`, `18`).

</decisions>

<specifics>
## Specific References

- Open-Meteo hourly fields: `temperature_2m`, `weather_code`, `precipitation_probability`. Query param: `hourly=temperature_2m,weather_code,precipitation_probability` + `forecast_days=2` (so we always have ≥12h ahead even near midnight).
- wttr.in `j1` payload: top-level `weather: [{ date, hourly: [{ time: '0'..'2100', tempC, weatherCode, chanceofrain }] }]`. Time stored as zero-padded string like `'0'`, `'300'` — meaning hour 0, 3, 6, 9, ... Parse as integer / 100 to get the hour.
- Existing `WMO_FROM_WTTR` map in `wttr-in-fallback.ts` already covers code translation — reuse it for hourly entries.
- Existing `WmoIcon` component already renders icons at custom `size` prop — pass small size (e.g. 14) in forecast columns.

</specifics>
