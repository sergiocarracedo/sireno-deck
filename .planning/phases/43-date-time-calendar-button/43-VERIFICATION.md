---
phase: 43
status: passed
verified: 2026-06-04
---

# Phase 43: Date-Time Calendar Button — Verification

## Must-Have Results

| Must-Have | Status |
| --- | --- |
| `BuiltinDateButtonSchema` is the new name; old `BuiltinCalendarSheetButtonSchema` is gone | ✓ |
| `DATE_BUTTON_INTERVAL_MS` is the new constant name; value is 60_000 | ✓ |
| Calendar stub at `calendar-sheet.tsx` is replaced with a real date render | ✓ |
| Render produces three text rows: month (uppercase, accent), day (primary, large), weekday (uppercase, foreground) | ✓ |
| The date button type is `'date'` (not `'calendar-sheet'`) | ✓ |
| `time_zone` config field is honored via `Intl.DateTimeFormat` | ✓ |
| `locale` config field is honored via `Intl.DateTimeFormat` | ✓ |
| Default locale is `en-US` when no `locale` is configured | ✓ |
| Default time zone is system local when no `time_zone` is configured | ✓ |
| date-time addon index.ts registers the new `date` type | ✓ |
| All existing date-time tests pass (with `calendar-sheet` → `date` migration) | ✓ |
| New render tests pass (5 cases) | ✓ |
| No commands (no `onTap`, no `onHold`) | ✓ |
| 60-second refresh interval | ✓ |

## Summary

**Score:** 14/14 must-haves verified

Phase goal achieved — the `calendar-sheet` stub is replaced with a real `date` button type that renders the date in the vertical layout from the user's reference image. Configurable timezone and locale are supported, 60s refresh, no commands. All tests pass.
