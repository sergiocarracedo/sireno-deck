# Quick Task 012 Research

**Task:** honor token-based formatting in the bundled date-time addon
**Date:** 2026-05-14

## Findings

- `builtin-addons/date-time/src/index.ts` already exposes `date_format` and `time_format` in the zod schema with defaults like `MM/DD/YYYY` and `HH:mm:ss`.
- The render path ignored both fields and always used `Intl.DateTimeFormat` with locale-driven `short` styles, so config strings had no effect.
- The existing test only asserted that `Intl.DateTimeFormat` was called, which locked in the wrong behavior instead of the user-facing contract.

## Recommended Approach

- Replace the Intl shortcut with a tiny built-in formatter that supports the shipped tokens: `YYYY`, `MM`, `DD`, `HH`, `mm`, and `ss`.
- Keep the change local to the date-time addon and reuse the existing schema surface instead of adding dependencies.
- Rewrite the focused addon test to assert exact formatted output for `date`, `time`, and `date-time` variants.

## Pitfalls

- Do not expand token support beyond the formats the addon already advertises unless there is a real contract for it.
- Use local-time `Date` construction in tests so expected strings do not depend on host timezone conversion from ISO strings.