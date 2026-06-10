---
description: Add ellipsis to date button weekday text to prevent wrapping
status: pending
---

# Quick Task 044: date-button-day-name-ellipsis

## Task Summary

Add `fit="ellipsis"` to the weekday Text component in the date button so long day names (e.g., "Wednesday") don't wrap.

## Files

- `packages/cli/src/builtin-addons/date-time/buttons/date.tsx`

## must_haves

- Weekday Text uses `fit="ellipsis"` to prevent wrapping on long day names

## Tasks

### Task 1: Add fit="ellipsis" to weekday Text

<files>
packages/cli/src/builtin-addons/date-time/buttons/date.tsx
</files>

<action>
In date.tsx line 52-54, change:
```
          <Text size="md" tone="foreground">
            {weekday}
          </Text>
```
to:
```
          <Text size="md" tone="foreground" fit="ellipsis">
            {weekday}
          </Text>
```
</action>

<verify>
Run the date button tests:
pnpm --filter sireno-deck-cli test src/builtin-addons/date-time/buttons/date.test.tsx
</verify>

<done>
Weekday text shows ellipsis when day name is too long to fit on one line.
</done>