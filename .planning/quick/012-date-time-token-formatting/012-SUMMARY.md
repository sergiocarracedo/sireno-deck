# Quick Task 012 Summary

**Task:** honor token-based formatting in the bundled date-time addon
**Completed:** 2026-05-14

## What was done
Replaced the bundled date-time addon's locale-short `Intl.DateTimeFormat` path with a small built-in token formatter that honors the existing `date_format` and `time_format` fields. Updated the focused tests to assert exact rendered output for `date`, `time`, and `date-time` variants.

## Files changed
- `builtin-addons/date-time/src/index.ts`: added token replacement for `YYYY`, `MM`, `DD`, `HH`, `mm`, and `ss`, and routed all variants through the configured format strings.
- `builtin-addons/date-time/src/index.test.ts`: replaced the Intl spy assertion with exact output checks.
- `CHANGELOG.md`: recorded the fix and root cause.
- `.planning/STATE.md`: tracked quick task 012 in project state.

## Commit
uncommitted