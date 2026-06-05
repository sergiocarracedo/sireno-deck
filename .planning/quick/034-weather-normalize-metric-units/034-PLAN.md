# Plan 034: Weather metric normalization + unit conversion functions

## Task 1: Normalize providers to always return metric

<files>
- packages/cli/src/builtin-addons/weather/domain/open-meteo-client.ts
- packages/cli/src/builtin-addons/weather/domain/wttr-in-fallback.ts
- packages/cli/src/builtin-addons/weather/domain/weather-controller.ts
</files>

<action>
1. In `open-meteo-client.ts`: Remove `units` parameter. Hardcode `celsius` and `kmh` in the API URL. Update type signature.
2. In `wttr-in-fallback.ts`: Remove `units` parameter. Always read `temp_C` and `windspeedKmph`. Update type signature.
3. In `weather-controller.ts`: Remove `units` argument from calls to `fetchOpenMeteoSnapshot` and `fetchWttrInSnapshot`.
</action>

<verify>
`pnpm --filter ./packages/cli exec vitest run src/builtin-addons/weather/` passes (existing failures from dirty Surface.tsx are pre-existing and unrelated).
</verify>

<done>
Providers always return metric data regardless of user preference.
</done>

## Task 2: Add unit conversion functions

<files>
- packages/cli/src/builtin-addons/weather/domain/unit-conversion.ts (new)
</files>

<action>
Create `domain/unit-conversion.ts` with:

```ts
export interface DisplayValue {
  value: number
  units: string
}

export function convertTemperature(celsius: number, to: 'metric' | 'imperial'): DisplayValue {
  if (to === 'imperial') {
    return { value: Math.round(celsius * 9 / 5 + 32), units: '°F' }
  }
  return { value: Math.round(celsius), units: '°C' }
}

export function convertWindSpeed(kmh: number, to: 'metric' | 'imperial'): DisplayValue {
  if (to === 'imperial') {
    return { value: Math.round(kmh * 0.621371), units: 'mph' }
  }
  return { value: Math.round(kmh), units: 'km/h' }
}
```

<verify>
Write focused tests in `domain/unit-conversion.test.ts`:
- convertTemperature from C to C returns same value + '°C'
- convertTemperature from C to F returns converted value + '°F'
- convertWindSpeed from km/h to km/h returns same value + 'km/h'
- convertWindSpeed from km/h to mph returns converted value + 'mph'
</verify>

<done>
Unit conversion functions created with test coverage.
</done>

## Task 3: Update Surface and button to use conversion functions

<files>
- packages/cli/src/builtin-addons/weather/components/Surface.tsx
- packages/cli/src/builtin-addons/weather/buttons/weather.tsx
</files>

<action>
1. In `Surface.tsx`: Add `units?: 'metric' | 'imperial'` prop. Import and use conversion functions. Replace raw `snap.temperature` and `snap.windSpeed` with converted display values.
2. In `weather.tsx`: Pass `units` from config to Surface.
</action>

<verify>
Run tests.
</verify>

<done>
Surface renders temperature and wind speed with correct unit labels based on user preference.
</done>
