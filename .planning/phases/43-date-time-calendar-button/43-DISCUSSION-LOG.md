# Phase 43 Discussion Log

**Date:** 2026-06-04
**Phase:** 43 — Date-Time Calendar Button
**Mode:** standard

## Carrying Forward

From v1.4 research (locked):
- Use existing `BuiltinCalendarSheetButtonSchema` (research predated the rename decision)
- 1-hour interval preferred — but the existing constant is 60s
- Mirror the media-player addon shape (controller, surface, button, schema, addon registration)

## Gray Areas Discussed

### 1. Button type name

**Options considered:**
- **Rename to `date`** ✅ chosen
- Keep `calendar-sheet` — rejected

**Decision:** Rename type from `calendar-sheet` to `date`. Cleaner, matches the user's mental model. Schema, constant, file references, and tests all rename.

### 2. Poll interval

**Options considered:**
- 1 hour (matches research) — rejected by user
- **1 minute (matches existing constant)** ✅ chosen
- Configurable per-button — rejected

**Decision:** Keep the existing 60_000ms (1 minute) interval. The user accepted the existing constant value rather than changing it to 1 hour.

### 3. Time zone

**Options considered:**
- Local time, no config — rejected
- **Configurable time zone string** ✅ chosen

**Decision:** Add optional `time_zone` field to the schema. Validated as a valid IANA time zone string (or omitted for system local).

### 4. Locale

**Options considered:**
- English fixed — rejected
- **Configurable locale** ✅ chosen
- System locale — rejected

**Decision:** Add optional `locale` field to the schema. Default to `en-US`. Used via `Intl.DateTimeFormat`.

## Agent's Discretion

- Exact `Text` size for the day number
- `typography` prop value
- Spacing between rows
- Validation timing for invalid locale/time_zone strings

## Deferred Ideas

- Per-button custom date format string
- 12h vs 24h (not shown on calendar)
- Holiday highlighting
- Week number display

## Next

`plan-phase 43` — convert these decisions into executable plans.
