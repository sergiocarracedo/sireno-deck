---
description: Reduce weather widget forecast page from 6 columns to 2
---

# Quick Task 040: Reduce Weather Forecast Columns

**Task:** in the weather widget the forecast page renders 6 elements, reduce to 2
**Completed:** 2026-06-07

## What was done

Sliced the `entries` prop in `Forecast.tsx` to render only the first 2 columns instead of 6.

## Files changed

- `packages/cli/src/builtin-addons/weather/buttons/components/Forecast.tsx`: slice `entries.slice(0, 2)` to show only 2 forecast columns

## Commit

TBD