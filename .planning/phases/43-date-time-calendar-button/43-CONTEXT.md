# Phase 43: Date-Time Calendar Button - Context

**Gathered:** 2026-06-04
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the existing `calendar-sheet` stub with a real `date` button type in the built-in `date-time` addon. Vertical layout: month (small, accent tone) → day (large, primary tone) → weekday (small, foreground tone). Polls every 60s, supports per-button configurable time zone and locale, no interactive commands.

The existing stub at `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx` has literal "asd2" placeholder text and an incorrect schema (extends `AddonButtonActionConfigSchema` which requires commands). Both need to be replaced.

</domain>

<decisions>
## Implementation Decisions

### Button type
- Rename the type from `calendar-sheet` to `date`
- Rename the schema from `BuiltinCalendarSheetButtonSchema` to `BuiltinDateButtonSchema`
- Rename the constant from `CALENDAR_SHEET_INTERVAL_MS` to `DATE_BUTTON_INTERVAL_MS` (keep value 60_000)
- Update the index.ts addon registration to expose the new `date` type
- Existing config files that reference `calendar-sheet` must be migrated (search and replace)

### Schema
- The schema no longer extends `AddonButtonActionConfigSchema` (calendar has no commands)
- New shape: `BuiltinDateButtonSchema` accepts optional `time_zone` and `locale` fields
- Default `time_zone`: system local
- Default `locale`: `en-US`
- The config validates that `time_zone` is a valid IANA time zone string (or omitted)
- The config validates that `locale` is a valid BCP-47 locale tag (or omitted)

### Render
- Three `Text` rows stacked vertically inside a `ButtonSurface full`
- Top row: month abbreviation (e.g., "OCT") — `size="xs"`, `tone="accent"`
- Middle row: day number (e.g., "12") — `size="xl"` or larger, `tone="primary"`
- Bottom row: weekday name (e.g., "SATURDAY") — `size="xs"`, `tone="foreground"`
- Use `Intl.DateTimeFormat` with the configured `locale` to format the values
- Time comes from `new Date()` translated to the configured `time_zone` (or system local if omitted)

### Polling
- 60_000ms (1 minute) — matches the existing `CALENDAR_SHEET_INTERVAL_MS` constant
- `defaultRenderIntervalMs: DATE_BUTTON_INTERVAL_MS`
- `defaultPollIntervalMs` not needed (no remote data, just `new Date()`)
- No interactive commands — `onTap` / `onHold` not implemented

### Migration
- Existing fixtures or tests that reference `calendar-sheet` must be updated to `date`
- `index.test.ts` for the date-time addon has tests for `calendar-sheet` that need updating

### Agent's Discretion
- Exact `Text` size for the day number (could be `xl` or `2xl` from the shared size ladder)
- Whether to use `typography="main"` or omit (the existing stub uses it)
- Spacing between rows (gap value)
- Whether to handle invalid `time_zone` / `locale` strings at validation vs runtime

</decisions>

<specifics>
## Specific Ideas

- **Visual reference:** the user showed an image with `OCT` (small, coral/red) → `12` (large white) → `SATURDAY` (small grey). The accent color for the month should be a warm coral/red — the existing `tone="accent"` token already maps to a coral color in the design system
- **No animations** — calendar is a day-changing widget, not a per-second clock. No blinking, no marquee
- **Reuse the existing `calendar-sheet.tsx` file as the implementation target** — replace the stub content rather than creating a new file

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/.planning/research/v1.4/FEATURES.md` — calendar button feature spec
- `/works/opensource/sireno-deck/.planning/research/v1.4/ARCHITECTURE.md` — date-time addon architecture
- `/works/opensource/sireno-deck/.planning/REQUIREMENTS.md` — `CAL-01`, `CAL-02`, `CAL-03`
- `/works/opensource/sireno-deck/.planning/phases/43-date-time-calendar-button/...` (this file)
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx` — existing stub to replace
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/date-time/schemas.ts` — existing schema to rename
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/date-time/index.ts` — addon registration
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/date-time/index.test.ts` — test file referencing the old type name
- `/works/opensource/sireno-deck/packages/cli/src/ui/Text.tsx` — `Text` component with `size`, `tone`, `typography`, `fit` props

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets
- **`BuiltinCalendarSheetButtonSchema`** at `date-time/schemas.ts:41` — rename to `BuiltinDateButtonSchema`, strip `AddonButtonActionConfigSchema` extension, add `time_zone` and `locale`
- **`CALENDAR_SHEET_INTERVAL_MS`** at `date-time/schemas.ts:7` — rename to `DATE_BUTTON_INTERVAL_MS`
- **`ButtonSurface full`** — the standard full-surface wrapper for button content
- **`Text` component** — already supports `size`, `tone`, `typography`, `fit` props needed for the three rows
- **`Intl.DateTimeFormat`** — built-in Node API for locale-aware date formatting
- **`Intl.supportedValuesOf('timeZone')`** — Node 18+ API for validating time zone strings at config time

### Established Patterns
- **Built-in addons register their buttons via `defineMountedButton` and export from `index.ts`** — same pattern the date-time addon already uses for the existing `clock` button
- **Existing `clock` button at `date-time/buttons/clock.tsx`** is a good reference for the render pattern (Text rows, ButtonSurface container)
- **The 60s interval constant pattern** is already used for `date-time` (existing constant)

### Integration Points
- **`date-time/schemas.ts`** — primary edit location (schema rename + new fields + new interval constant)
- **`date-time/buttons/calendar-sheet.tsx`** — replace the stub with the real `date` button render
- **`date-time/index.ts`** — update import + export
- **`date-time/index.test.ts`** — update test to assert on `date` type

</code_context>

<deferred>

## Deferred Ideas

- **Per-button date format string** (e.g., custom output) — out of scope; the format is fixed (month / day / weekday)
- **12h vs 24h time display** — calendar button doesn't show time; this belongs on the clock button (Phase 8)
- **Holiday highlighting** — out of scope; calendar shows only date
- **Week number display** — out of scope; not in the design

---

*Phase: 43-date-time-calendar-button*
*Context gathered: 2026-06-04*
