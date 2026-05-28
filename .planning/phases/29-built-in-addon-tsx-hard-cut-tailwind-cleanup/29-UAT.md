---
status: complete
phase: 29-built-in-addon-tsx-hard-cut-tailwind-cleanup
source:
  - .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-01-SUMMARY.md
  - .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-02-SUMMARY.md
  - .planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-03-SUMMARY.md
started: 2026-05-28T08:57:45+02:00
updated: 2026-05-28T09:21:40+02:00
---

## Current Test
number: 6
name: Utility-Layer Cleanup Is Visible On The Remaining Built-Ins
expected: |
  Inspect the current emulator output for the built-in action/change-deck/toggle/emoji
  surfaces touched by Phase 29.

  Expected: the shared layout still looks intentional after the utility cleanup:
  framed action/change-deck/toggle buttons still have padding and spacing, labels can
  use balanced wrapping instead of collapsing awkwardly, and the emoji selector entries
  still stack icon/text cleanly. This should look like the same product surface, not a
  regression to cramped or raw unstyled markup.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test On The Real Emulator Path
expected: Kill any running Sireno emulator or daemon first. From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`. Startup should succeed without legacy-contract errors such as `definition.createInstance is not a function`, `definition.render is not a function`, or stale button-definition crashes. The CLI should print a local emulator URL, and the browser surface should show the configured deck with live date-time buttons, the `Emoji` button, and the `Action` buttons rendered through the shipped TSX/mounted path.
result: pass

### 2. Date-Time Built-Ins Still Render Through The Shipped Registry Surface
expected: With the emulator running, verify the default config deck and the committed review fixtures still expose the built-in date/time family cleanly after the split. On `config.yml`, the live `date-time` buttons should keep updating normally. Then, if needed, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config packages/cli/fixtures/phase-8/config.analog-clock.yml --port 0` and `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config packages/cli/fixtures/phase-9/config.calendar-sheet.yml --port 0`. Expected: the `analog-clock` and `calendar-sheet` buttons both render successfully on the emulator without missing-type errors, blank surfaces, or broken live updates.
result: pass

### 3. Day.js-Backed Date Formats Behave Honestly On The Shipped Surface
expected: Open a config that uses the built-in `date-time` button with explicit `date_format` or `time_format` values, or temporarily adjust one local test config if needed, and run it through `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config <your-config> --port 0`. Expected: the rendered label follows Day.js token behavior, not the old custom token map. Practical checks: `HH:mm:ss` should show a normal live time, `YYYY-MM-DD` should render literally in that format, and unsupported richer formatting behavior from the deferred DSL should not appear magically.
result: pass

### 4. Emoji Selector Still Works As A Split Multi-Button Built-In
expected: Start either `config.yml` or `packages/cli/fixtures/phase-22/config.emulator-demo.yml` through the emulator. Click the `Emoji` button to enter the emoji deck. Expected: the emoji selector still shows category/entry/back surfaces correctly after the one-button-per-file split, selecting an emoji still runs the configured command path, and returning to the main deck still works. There should be no broken icon paths, missing button types, or stale createInstance-era crashes.
result: pass

### 5. Core Buttons Still Behave Correctly After The TSX Hard Cut
expected: Run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config packages/cli/fixtures/phase-14/config.toggle-internal.yml --port 0`. Expected: the built-in `toggle` button still renders and toggles between OFF and ON states, the `Apps` change-deck button still navigates into the secondary deck, and the `Main` button returns you back. This verifies that the remaining core button family still behaves correctly after the `.ts` -> `.tsx` conversion and mounted-contract cleanup.
result: pass

### 6. Utility-Layer Cleanup Is Visible On The Remaining Built-Ins
expected: Inspect the current emulator output for the built-in action/change-deck/toggle/emoji surfaces touched by Phase 29. Expected: the shared layout still looks intentional after the utility cleanup: framed action/change-deck/toggle buttons still have padding and spacing, labels can use balanced wrapping instead of collapsing awkwardly, and the emoji selector entries still stack icon/text cleanly. This should look like the same product surface, not a regression to cramped or raw unstyled markup.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
