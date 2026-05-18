---
status: pending
phase: 12-backgrounds-text-fitting
source:
  - 12-01-SUMMARY.md
started: 2026-05-18T16:00:00+02:00
updated: 2026-05-18T16:00:00+02:00
---

## Current Test
number: 1
name: color-only background precedence review path
expected: |
  Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-12/config.background-precedence.yml`. On the main deck, compare key `0` (`Button Override`) with key `1` (`Deck Fallback`). Key `0` must render with its own configured override color, while key `1` must inherit the deck background color from the `main` deck. Then press key `2` to navigate to `theme-fallback`. Key `0` on that deck must render with the active theme background rather than the `main` deck color, because the `theme-fallback` deck defines no background override.
awaiting: review

## Tests

### 1. Button Override Beats Deck Background And Theme Background
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-12/config.background-precedence.yml`. On the `main` deck, key `0` (`Button Override`) should visibly differ from key `1` (`Deck Fallback`) because key `0` uses its own configured color `#4b1f2f` while key `1` inherits the deck color `#153423`. Then press key `2` to navigate to `theme-fallback`. Key `0` (`Theme Fallback`) should visibly differ from the `Deck Fallback` key on `main` and should use the theme-backed default-card tint because the `theme-fallback` deck has no `background` field.
fixture: `packages/cli/fixtures/phase-12/config.background-precedence.yml`
result: pending
pass_if:
  - Key `0` on `main` uses its own button-level color and does not match key `1`.
  - Key `1` on `main` inherits the `main` deck background rather than the theme background.
  - Key `0` on `theme-fallback` uses the theme background path rather than inheriting the previous deck color.
  - Navigation to `theme-fallback` does not change the already-rendered `Button Override` and `Deck Fallback` relationship on `main`.
fail_if:
  - Button-level background changes sibling buttons.
  - Deck fallback leaks across decks after navigation.
  - The theme-fallback deck still appears to use the `main` deck background.

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0

## Gaps

This UAT covers only Wave 1 background precedence. Wave 2 still needs a separate committed review path for explicit `shrink` and `wrap` text fitting.
