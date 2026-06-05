# Plan 033: Change weather button poll interval units to minutes

## Task 1: Rename poll_interval_ms to poll_interval_min in weather addon

<files>
- packages/cli/src/builtin-addons/weather/schemas.ts
- packages/cli/src/builtin-addons/weather/buttons/weather.tsx
- packages/cli/src/builtin-addons/weather/index.test.ts
</files>

<action>
1. In `schemas.ts`: Rename `poll_interval_ms` field to `poll_interval_min`. Change `min(60_000)` to `min(1)` and `default(600_000)` to `default(10)`.
2. In `weather.tsx`: Change `defaultPollIntervalMs` from `({ config }) => config.poll_interval_ms` to `({ config }) => config.poll_interval_min * 60_000`.
3. In `index.test.ts`: Change expected key from `poll_interval_ms: 600_000` to `poll_interval_min: 10`.
</action>

<verify>
Run `pnpm --filter cli test -- run packages/cli/src/builtin-addons/weather/` - all weather tests should pass.
</verify>

<done>
- Schema field renamed to `poll_interval_min`
- Button definition converts minutes to milliseconds
- Tests pass with new field name
</done>
