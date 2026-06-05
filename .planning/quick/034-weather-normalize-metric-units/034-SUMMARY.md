# Quick Task 034 Summary

**Task:** Weather snapshot should always store values in metric units with conversion functions to user's preferred units
**Completed:** 2026-06-05

## What was done
1. Normalized providers to always return metric data: open-meteo hardcoded to celsius/kmh, wttr.in always reads temp_C/windspeedKmph
2. Added `domain/unit-conversion.ts` with `convertTemperature()` and `convertWindSpeed()` that return `{value, units}` objects
3. Updated Surface to accept `units` prop and use conversion functions for rendered temperature and wind speed

## Files changed
- `packages/cli/src/builtin-addons/weather/domain/open-meteo-client.ts`: Removed `units` param, hardcoded celsius/kmh
- `packages/cli/src/builtin-addons/weather/domain/wttr-in-fallback.ts`: Removed `units` param, always reads temp_C/windspeedKmph
- `packages/cli/src/builtin-addons/weather/domain/weather-controller.ts`: Removed `units` arg from provider calls
- `packages/cli/src/builtin-addons/weather/domain/unit-conversion.ts`: New file with `convertTemperature()`, `convertWindSpeed()` returning `{value, units}`
- `packages/cli/src/builtin-addons/weather/domain/unit-conversion.test.ts`: Tests for conversion functions
- `packages/cli/src/builtin-addons/weather/components/Surface.tsx`: Added `units` prop, uses conversion functions for display
- `packages/cli/src/builtin-addons/weather/buttons/weather.tsx`: Passes `config.units` to Surface

## Commits
- `a1ee8e8` — normalize weather providers to always return metric
- `d3debeb` — add unit conversion functions for temperature and wind speed
- `e4c83a7` — use unit conversion functions in Surface rendering
