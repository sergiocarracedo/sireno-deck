---
description: Reduce weather widget forecast page from 6 columns to 2
must_haves:
  - truth: Forecast page shows 2 columns instead of 6
    artifacts:
      - packages/cli/src/builtin-addons/weather/buttons/components/Forecast.tsx
    key_links:
      - packages/cli/src/builtin-addons/weather/buttons/components/Forecast.tsx
---

# Quick Task 040 Plan: Reduce Weather Forecast Columns

## Task 1: Slice entries to 2 in Forecast.tsx

<files>
packages/cli/src/builtin-addons/weather/buttons/components/Forecast.tsx
</files>

<action>
In `Forecast.tsx`, change the `entries.map(...)` to first slice the array: `entries.slice(0, 2).map(...)`. This reduces the forecast from 6 columns to 2.
</action>

<verify>
Read the file and confirm the `.slice(0, 2)` is applied to entries before mapping.
</verify>

<done>
Forecast.tsx renders only 2 columns regardless of how many entries are passed.
</done>