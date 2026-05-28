---
status: complete
phase: 01-theme-relative-typography-contract
source:
  - .planning/phases/01-theme-relative-typography-contract/01-01-SUMMARY.md
  - .planning/phases/01-theme-relative-typography-contract/01-02-SUMMARY.md
started: 2026-05-28T16:36:19+02:00
updated: 2026-05-28T17:10:47+02:00
---

## Current Test
number: 6
name: Browser Document Root Still Looks Like The Same Product Without Body-Level `font-main`
expected: |
  In any emulator run from the tests above, inspect the overall browser-rendered deck shell.

  Expected: removing `class="font-main"` from the browser document body should not make the
  overall deck typography fall back to an obviously wrong font, weight, or tracking. The deck
  should still look like the same Sireno surface, just with typography ownership now made explicit
  instead of inherited through the body class.
awaiting: complete

## Tests

### 1. Typography Sizes Stay Relative On The Live Theme Surface
expected: Start the emulator on the theme-typography fixture: `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config packages/cli/fixtures/phase-19/config.theme-typography.yml --port 0`. Expected: the deck boots normally and the text surfaces using different typography roles still look intentionally different, but their size steps now feel proportional to each role's own base instead of one role looking stuck at a hard-coded size. In practical terms, labels using `sm/md/lg` should scale relative to their active role base, with `md` reading like the role's natural default.
result: pass

### 2. Built-In Text Surfaces No Longer Depend On Wrapper Typography Spans
expected: With the default `config.yml` running through the emulator, inspect the built-in date/time and action-style buttons. Expected: they still render with the same overall visual intent, but there should be no obvious regression where labels disappear, collapse, or inherit the wrong size because a removed outer `font-main`/`font-mono` wrapper used to be doing hidden sizing work. The live date/time button should still render as a readable large text block, and action text should still read as primary/main typography.
result: pass

### 3. Analog Clock And Calendar Sheet Still Render Cleanly After The Typography Sweep
expected: Run the emulator with `packages/cli/fixtures/phase-8/config.analog-clock.yml` and `packages/cli/fixtures/phase-9/config.calendar-sheet.yml`. Expected: both surfaces still render their labels cleanly after the raw typography wrapper removal. The clock labels and calendar labels should still show the intended emphasis/tone without missing text, odd fallback sizing, or collapsed label layout.
result: pass

### 4. Locked Time Tile Uses The New Explicit Text Contract Without Visual Regression
expected: Run the emulator with `packages/cli/fixtures/phase-20/config.locked-time-layout.yml`. Expected: the locked-time layout still looks intentional, and the hour / separator / minute tiles remain readable with the large mono text treatment. Removing the old raw `font-mono` wrapper should not make the digit tiles shrink, lose contrast, or inherit the wrong typography.
result: pass

### 5. Emoji Fallback And Chip-Like Aux Typography Still Look Deliberate
expected: Use the default config or `packages/cli/fixtures/phase-22/config.emulator-demo.yml` and enter the emoji selector. Expected: unsupported emoji fallback text still uses the intended main/foreground treatment and remains readable after the wrapper sweep. Also inspect any chip-like aux typography in the emulator output: it should still read like deliberate aux text, not like browser-default text after the `font-aux` class stopped acting as a hidden sizing shortcut.
result: pass

### 6. Browser Document Root Still Looks Like The Same Product Without Body-Level `font-main`
expected: In any emulator run from the tests above, inspect the overall browser-rendered deck shell. Expected: removing `class="font-main"` from the browser document body should not make the overall deck typography fall back to an obviously wrong font/weight/tracking. The deck should still look like the same Sireno surface, just with typography ownership now made explicit instead of inherited through the body class.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
