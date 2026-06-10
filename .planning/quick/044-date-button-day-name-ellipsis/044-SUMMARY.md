# Quick Task 044 Summary

**Task:** In the date button the day name today is too long and wraps, i guess we should use ellipsis

**Completed:** 2026-06-10

## What was done

Added `fit="ellipsis"` to the weekday Text component in the date button so long day names (e.g., "Wednesday") truncate with ellipsis instead of wrapping. Also fixed two pre-existing test issues: wrong import path and wrong surface attribute name.

## Files changed

- `packages/cli/src/builtin-addons/date-time/buttons/date.tsx`: Added `fit="ellipsis"` to weekday Text
- `packages/cli/src/builtin-addons/date-time/buttons/date.test.tsx`: Fixed import path and surface attribute assertion

## Commit

088454b