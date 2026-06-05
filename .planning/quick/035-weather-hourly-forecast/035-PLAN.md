# Quick Task 035 Plan: Weather hourly forecast

**Slug:** `035-weather-hourly-forecast`
**Date:** 2026-06-05
**Source:** `.planning/quick/035-weather-hourly-forecast/CONTEXT.md`

## Goal

Make the weather button's `forecast` page render a real hourly forecast (6 entries: hour / WMO icon / temp / precip%) pulled from open-meteo (2h cadence) with wttr.in fallback (native 3h cadence).

## Tasks

### Task 1 — Extend snapshot shape + open-meteo hourly fetch

<files>
- packages/cli/src/builtin-addons/weather/domain/weather-controller.ts
- packages/cli/src/builtin-addons/weather/domain/open-meteo-client.ts
- packages/cli/src/builtin-addons/weather/domain/open-meteo-client.test.ts (new, optional)
</files>

<action>
1. In `weather-controller.ts`:
   - Add interface `HourlyForecastEntry { time: string; temperature: number; weatherCode: number; precipitationChance: number }`.
   - Add field `hourly: HourlyForecastEntry[]` to `WeatherSnapshot`.
   - Update `createUnavailableWeatherSnapshot()` to include `hourly: []`.
2. In `open-meteo-client.ts`:
   - Extend the URL with `&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=2`.
   - After parsing `current`, parse `json.hourly = { time: string[], temperature_2m: number[], weather_code: number[], precipitation_probability: number[] }`.
   - Compute current epoch hour from `globalThis.Date.now()`; find the first hourly index whose ISO time is `>= now`, then collect 6 entries at stride 2 (every other index). Stop if we run out of data — return fewer entries rather than fabricate.
   - For each entry, store `time` as the 2-digit local hour from the ISO string (e.g. `'14'`), `temperature` as the metric number, `weatherCode` (default 0), `precipitationChance` (default 0).
   - Return `{ ...currentFields, hourly: entries }`.
</action>

<verify>
- `pnpm -C packages/cli test -- weather` passes including any new hourly assertions.
- Spot-check: in a quick node REPL or test, hit the open-meteo URL pattern and confirm the returned snapshot has 6 hourly entries when full data is available.
</verify>

<done>
- `WeatherSnapshot` exposes a typed `hourly` array (always metric).
- `fetchOpenMeteoSnapshot` returns up to 6 entries starting from the next future hour, stride 2, no fabrication.
- `createUnavailableWeatherSnapshot()` always returns `hourly: []`.
- All existing weather tests still pass (snapshot type update doesn't break anything).
</done>

---

### Task 2 — wttr.in fallback hourly support

<files>
- packages/cli/src/builtin-addons/weather/domain/wttr-in-fallback.ts
- packages/cli/src/builtin-addons/weather/domain/wttr-in-fallback.test.ts (new, optional)
</files>

<action>
1. In the parsed JSON typing, extend `weather: Array<{ hourly: Array<{ time: string; tempC: string; weatherCode: string | number; chanceofrain: string }> }>`.
2. Build a flat list across `weather[0].hourly` first (today), then continue into `weather[1].hourly` (tomorrow) so we have ≥6 future entries even late in the day.
3. Convert each hourly `time` ('0'..'2100') to an integer hour (`parseInt(time) / 100`).
4. Pair each entry with its absolute hour-of-day on the right `weather[i].date`. Skip entries whose absolute timestamp is `< now`.
5. Take the first 6 future entries (native 3h cadence — do NOT skip every other).
6. Map each entry to `HourlyForecastEntry`:
   - `time`: 2-digit hour, e.g. `String(hour).padStart(2, '0')`.
   - `temperature`: `Number(tempC)`.
   - `weatherCode`: `mapWttrCodeToWmo(weatherCode)` (reuse existing helper).
   - `precipitationChance`: `Number(chanceofrain ?? '0')`.
7. Return snapshot with `hourly` populated.
</action>

<verify>
- `pnpm -C packages/cli test -- weather` passes.
- Fixture-style unit test: feed a synthetic `j1` payload with `weather[0].hourly` populated and assert 6 entries returned at 3h cadence; assert WMO mapping was applied.
</verify>

<done>
- `fetchWttrInSnapshot` returns the next 6 future hourly entries in the same shape as `fetchOpenMeteoSnapshot` (native 3h cadence — honest signal, no interpolation).
- Entries are always metric (tempC, no °F conversion at fetch time).
</done>

---

### Task 3 — Forecast page UI + tests

<files>
- packages/cli/src/builtin-addons/weather/buttons/components/Surface.tsx
- packages/cli/src/builtin-addons/weather/buttons/components/Forecast.tsx (new — small component for the 6-column layout)
- packages/cli/src/builtin-addons/weather/buttons/weather.test.tsx
</files>

<action>
1. Create `Forecast.tsx`:
   - Accepts `{ entries: HourlyForecastEntry[]; units: 'metric' | 'imperial' }`.
   - Renders a flex row of N columns (one per entry, up to 6).
   - Per column: hour text (small), `WmoIcon` size ~14, converted temp (`convertTemperature`) without unit suffix to save space, precip % as small text with the `droplet` icon scaled tiny — or just `XX%`.
   - If `entries.length === 0`, render a single centered `Text size="xs"`: `No forecast`.
   - Style: `flex h-full w-full items-stretch justify-between gap-0.5 px-1`. Each column: `flex flex-col items-center justify-center`.
2. In `Surface.tsx`:
   - Import the new `Forecast`.
   - Replace the existing `forecast` page body with `<Forecast entries={snap.hourly} units={displayUnits} />`.
3. Update `weather.test.tsx`:
   - Add `hourly: []` to the `availableSnapshot` fixture so existing tests still typecheck.
   - Add 2 new tests:
     - `forecast` page with empty hourly → contains `No forecast`.
     - `forecast` page with 3 sample entries → contains all 3 hour labels (e.g. `14`, `16`, `18`) and at least one converted temp.
   - To set the page in tests: pass an initial `snapshot` with `page: 'forecast'` in the store harness.
</action>

<verify>
- `pnpm -C packages/cli test -- weather` passes (all old + new).
- `pnpm -C packages/cli lint` passes for the changed files.
- Visual sanity (optional, manual): launch the dev daemon with the weather button configured, tap twice to reach the forecast page, confirm 6 columns render with icon + hour + temp + precip.
</verify>

<done>
- `Forecast.tsx` exists and renders 6 columns when given 6 entries.
- `Surface.tsx`'s `forecast` page delegates to `Forecast` and no longer shows the wind/humidity placeholder.
- `weather.test.tsx` has at least 2 new tests covering empty and populated forecast page.
- All `pnpm -C packages/cli test` runs green.
</done>

---

## Notes

- Cadence asymmetry (2h primary vs 3h fallback) is captured in CONTEXT.md decisions — it's intentional honest-signal preservation, not a bug.
- No new config knobs in this task. If user wants `forecast_hours` / `cadence_h` configurable later, that's a follow-up.
- `unit-conversion.ts` is already imported in `Surface.tsx`; the new `Forecast` component reuses it directly.
