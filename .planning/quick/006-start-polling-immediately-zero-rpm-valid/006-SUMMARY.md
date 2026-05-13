# Quick Task 006 Summary

**Task:** start polling immediately per button and treat 0 RPM as valid fan data
**Completed:** 2026-05-13

## What was done
Changed deck activation so each button's polling scheduler starts immediately after the initial deck render, instead of waiting for activation priming to settle. Updated fan metric normalization so a readable sensor value of `0 RPM` is treated as valid idle telemetry, while truly missing sensor data still falls back to the unavailable state.

## Files changed
- `packages/cli/src/deck/runtime.ts`: started active-deck schedulers before priming completes.
- `packages/cli/src/deck/runtime.test.ts`: added regression coverage proving slow priming does not delay polling startup.
- `packages/cli/src/system/live-metrics.ts`: accepted `0 RPM` as readable fan data.
- `packages/cli/src/system/live-metrics.test.ts`: covered `0 RPM` as valid telemetry and kept missing-sensor fallback coverage.
- `CHANGELOG.md`: recorded the fixes, root cause, and learning.
- `.planning/STATE.md`: tracked the quick task in project state.

## Why It Broke
The activation path still treated priming completion as the gate for starting schedulers, which serialized polling startup behind the slowest priming refresh. Separately, the fan adapter had encoded `> 0` as the definition of readability, which incorrectly collapsed real idle telemetry into the same bucket as missing sensor data.

## What We Learned
Priming and steady-state polling are different responsibilities. Priming can lag or fail, but scheduler startup should still happen immediately, and telemetry adapters should distinguish valid zero values from missing data instead of using truthiness-by-threshold shortcuts.
