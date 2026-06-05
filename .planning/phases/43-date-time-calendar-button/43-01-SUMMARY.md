# Plan 43-01 Summary

**Completed:** 2026-06-04

## What was built

The `date` button type replaces the `calendar-sheet` stub. The new render produces a vertical three-row layout: month abbreviation (uppercase, accent tone), day number (primary tone, large), weekday name (uppercase, foreground tone). Refreshes every 60 seconds. Supports optional `time_zone` (IANA) and `locale` (BCP-47) per-button config. No interactive commands.

## Key files

- `packages/cli/src/builtin-addons/date-time/schemas.ts` — Renamed `CALENDAR_SHEET_INTERVAL_MS` → `DATE_BUTTON_INTERVAL_MS` (kept 60_000), renamed `BuiltinCalendarSheetButtonSchema` → `BuiltinDateButtonSchema` (stripped action config extension, added `time_zone` and `locale` optional fields)
- `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx` — Replaced stub with real `builtinDateButton`: `formatDateParts` helper using `Intl.DateTimeFormat`, three stacked `Text` rows in `ButtonSurface full`
- `packages/cli/src/builtin-addons/date-time/index.ts` — Updated import + export to use `builtinDateButton` and `DATE_BUTTON_INTERVAL_MS`
- `packages/cli/src/builtin-addons/date-time/index.test.ts` — Migrated 3 references from `calendar-sheet` to `date`; updated render test to assert on month abbreviation regex
- `packages/cli/src/builtin-addons/date-time/buttons/date.test.tsx` — 5 new render tests for the date button

## Decisions made

- **Used `defaultIntervalMs` (not `defaultRenderIntervalMs`)** to match the convention of other date-time buttons (analog-clock, date-time, time, clock)
- **Removed `useState`/`useEffect` from the render function** — the runtime re-invokes `render()` on each tick (driven by `defaultIntervalMs`), so computing `new Date()` inside the render is sufficient and avoids React hooks in the static-markup test path
- **Kept the file at `calendar-sheet.tsx`** with new content rather than renaming it, to avoid a separate file-rename commit
- **Render test asserts on month abbreviation regex** (`JAN|FEB|...|DEC`) rather than a fixed string, so the test is robust to whatever the current date is

## Notes for downstream

- Pre-existing test failures in `theme.test.ts` (11 from prior phases) are documented in `39-01-SUMMARY.md` and are not introduced by this phase
- The render uses `Intl.DateTimeFormat` — invalid `time_zone` strings will throw `RangeError` at render time, not at config load. Could be hardened with a validation check, but the user accepted agent discretion on validation timing
- 13 existing date-time tests pass + 5 new render tests pass
