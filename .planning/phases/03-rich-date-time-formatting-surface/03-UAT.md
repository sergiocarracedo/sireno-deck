---
status: complete
phase: 03-rich-date-time-formatting-surface
source:
  - .planning/phases/03-rich-date-time-formatting-surface/03-01-SUMMARY.md
  - .planning/phases/03-rich-date-time-formatting-surface/03-02-SUMMARY.md
started: 2026-05-29T17:55:00+02:00
updated: 2026-05-29T18:39:00+02:00
---

# Phase 3 UAT — Rich Date-Time Formatting Surface

## Current Test

number: 1
name: Browser Date-Time Rich Markup Review
expected: |
  From `packages/cli`, run:

  `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-22/config.emulator-demo.yml --port 0`

  On the main deck, key `0` should render the built-in `date-time` button through the real single-field `format` contract. The first line should show `HH:mm` with accent tone and a larger size. The second line should show highlighted date text plus a blinking danger-toned seconds segment. Blink is intentionally always-on in this phase.

  Then navigate to `Fallback`. The invalid markup example should render literally rather than partially parsing, while still showing expanded time/date values inside the literal output.
awaiting: user response

## Tests

### Test 1: Browser Date-Time Rich Markup Review
expected: From `packages/cli`, run `pnpm exec tsx src/cli/index.ts emulate --config fixtures/phase-22/config.emulator-demo.yml --port 0`. On the main deck, key `0` should render the built-in `date-time` button through the real single-field `format` contract, with accent-toned larger `HH:mm` on the first line and highlighted date text plus a blinking danger-toned seconds segment on the second line. Then navigate to `Fallback` and confirm invalid markup renders literally rather than partially parsing, while still showing expanded time/date values.
result: issue
reported: "every perfect, except: the 0 button in the main deck is nice except the HH:mm is not bigger, in any case i guess we need a xxl size and make the diference between sizes more evident"
severity: major

## Summary

```yaml
total: 1
passed: 0
issues: 1
pending: 0
skipped: 0
```

## Gaps

- truth: "On the main deck, key `0` should render the first line `HH:mm` with a visibly larger size than the surrounding date-time content."
  status: failed
  reason: "User reported: every perfect, except: the 0 button in the main deck is nice except the HH:mm is not bigger, in any case i guess we need a xxl size and make the diference between sizes more evident"
  severity: major
  root_cause: "The Phase 3 review fixture asks shared `Text` to render `<xl>HH:mm</xl>` inside the built-in date-time button, but that button already wraps the whole label in outer `Text size=\"xl\"`. Because the inner rich tag and the outer shell resolve to the same `text-xl` utility, the first line has no actual size step-up against its surroundings. The automated tests only proved that rich size tags survive the parser and appear in HTML; they did not prove that the chosen fixture creates a visible contrast on the real review path. The repo already has a larger shared size token (`2xl`), so the gap is fixture/coverage drift, not missing parser support."
  affected_files:
    - packages/cli/fixtures/phase-22/config.emulator-demo.yml
    - packages/cli/src/builtin-addons/date-time/index.test.ts
    - packages/cli/src/render/theme-utilities.ts
  test: 1

## Investigation

### Hypothesis 1: The shared rich-text parser is dropping or flattening inline size tags on the date-time path
**Status:** denied
**Files checked:**
- `packages/cli/src/ui/Text.tsx`
- `packages/cli/src/builtin-addons/date-time/index.test.ts`
**Finding:** The parser still recognizes rich size tags including `xl` and `2xl`, and mounted date-time tests already prove those tags survive into rendered HTML as `data-sireno-rich-text-tag` markers. The bug is not that size tags disappear entirely.
**Code path:** `formatDigitalDateTimeLabel(...)` -> shared `Text` rich parser in `packages/cli/src/ui/Text.tsx` -> rendered rich spans with size classes
**Why denied:** If the parser were dropping size tags, the existing mounted rich date-time tests would not show rich size markers at all. They do.

### Hypothesis 2: The review fixture asks for the same size twice, so the first line cannot look larger on the real button
**Status:** confirmed
**Files checked:**
- `packages/cli/fixtures/phase-22/config.emulator-demo.yml`
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`
- `packages/cli/src/render/theme-utilities.ts`
- `packages/cli/src/builtin-addons/date-time/index.test.ts`
**Finding:** The built-in date-time button renders the whole label through `<Text size=\"xl\">`, while the committed review fixture formats the first line as `<accent><xl>HH</xl></accent><blink>:</blink><xl>mm</xl>...`. In `packages/cli/src/render/theme-utilities.ts`, both outer `size=\"xl\"` and inner `<xl>` resolve to the same `.text-xl` multiplier, so the first line has no larger font-size than the shell baseline. The repo already supports `.text-2xl`, and the locked-time tile uses that token successfully.
**Code path:** `packages/cli/fixtures/phase-22/config.emulator-demo.yml` -> `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx` outer `Text size=\"xl\"` -> `packages/cli/src/ui/Text.tsx` inner `<xl>` tags -> same `.text-xl` utility on both layers -> no visible size contrast
**Root cause:** The Phase 3 review path and mounted test fixture accidentally compare `xl` against an outer `xl` baseline, so the claimed "larger first line" behavior was never actually encoded in the real review contract.
**Evidence:**
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx` line 18 sets outer `size=\"xl\"`.
- `packages/cli/fixtures/phase-22/config.emulator-demo.yml` line 8 uses inner `<xl>` for the main time line.
- `packages/cli/src/render/theme-utilities.ts` maps both outer `xl` and inner `<xl>` to the same `.text-xl` class.
- `packages/cli/src/builtin-addons/date-time/index.test.ts` currently checks only that rich size tags render, not that the chosen review contract creates a larger-than-baseline line.
**Confidence:** high

## Root Cause

**Location:** `packages/cli/fixtures/phase-22/config.emulator-demo.yml:8`, `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx:18`, and the current `TEXT_SIZE_MULTIPLIERS` ladder in `packages/cli/src/render/theme-utilities.ts`
**Cause:** The real review path asks for `<xl>` inside a button that already uses outer `Text size=\"xl\"`, so the time line never becomes larger than its surroundings.
**Why it produces the symptom:** Shared `Text` is doing exactly what the code asks: both layers resolve to the same `text-xl` class, which means no visible size delta on the button even though the markup looks like it should enlarge the time.
**Confidence:** high

## Proposed Fix

**Approach:** Keep the shared size vocabulary intact and use the existing `2xl` token on the review path where we actually need a visible step-up, then widen the shared size ladder enough that adjacent levels are easier to distinguish in real deck buttons. Update the mounted date-time proof and committed review fixture together so they assert an honest larger-than-baseline contract instead of only parser survival.
**Files to change:**
- `packages/cli/fixtures/phase-22/config.emulator-demo.yml`: change the main time line to use the top shared size token so the real UAT path actually asks for a larger first line.
- `packages/cli/src/builtin-addons/date-time/index.test.ts`: align the mounted date-time proof with the new larger-size contract and add assertions that cover the chosen size token honestly.
- `packages/cli/src/render/theme-utilities.ts`: increase size separation in `TEXT_SIZE_MULTIPLIERS` so the shared `Text` ladder is more visually distinct on-device.

**Risk:** medium. Changing the shared size ladder affects every `Text` consumer, so the fix must stay modest and verify that existing large-text surfaces such as the locked-time tile remain sane while making adjacent levels easier to distinguish.

## Rerun Path

Closure plan: `.planning/phases/03-rich-date-time-formatting-surface/03-03-PLAN.md`

After implementing that plan, rerun `verify-work 3` so the real emulator review path can confirm the time line is now visibly larger and the fallback path still behaves the same.

## Rerun Preparation After 03-03-PLAN.md

- Closure implementation updated the committed main-deck review path to use the existing shared `<2xl>` token for the `HH` and `mm` segments instead of repeating the outer `xl` baseline.
- The shared size ladder in `packages/cli/src/render/theme-utilities.ts` is now wider, so adjacent `Text` sizes should read more distinctly during the rerun.
- The original user report, root_cause record, and failed Test 1 evidence remain unchanged above; the next honest step is to rerun `verify-work 3` on the same emulator command and confirm the first line now looks larger while the fallback deck still renders invalid markup literally.
