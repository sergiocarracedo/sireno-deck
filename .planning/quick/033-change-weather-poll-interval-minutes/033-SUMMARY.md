# Quick Task 033 Summary

**Task:** Change weather button poll interval units to minutes
**Completed:** 2026-06-05

## What was done
Renamed `poll_interval_ms` to `poll_interval_min` in the weather addon schema, updated the button definition to convert the minute value to milliseconds (`* 60_000`), and updated the schema test.

## Files changed
- `packages/cli/src/builtin-addons/weather/schemas.ts`: Renamed `poll_interval_ms` to `poll_interval_min`, changed min from `60_000` to `1` and default from `600_000` to `10`
- `packages/cli/src/builtin-addons/weather/buttons/weather.tsx`: Updated `defaultPollIntervalMs` to convert `poll_interval_min * 60_000`
- `packages/cli/src/builtin-addons/weather/index.test.ts`: Updated test expectation from `poll_interval_ms: 600_000` to `poll_interval_min: 10`

## Commit
c9e1205
