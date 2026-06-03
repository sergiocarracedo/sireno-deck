---
status: pending
phase: 12-backgrounds-text-fitting
source:
  - 12-01-SUMMARY.md
  - 12-02-SUMMARY.md
started: 2026-05-18T16:00:00+02:00
updated: 2026-05-18T16:40:00+02:00
---

## Current Test
number: 2
name: explicit shrink and wrap review path
expected: |
  Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-12/config.text-fit.yml`. Compare key `0` and key `1` on the same deck. Key `0` should stay on the one-line shared label path and shrink before clipping. Key `1` should visibly wrap into multiple lines because it opts into `fit: wrap`. Both keys should still use the shared/default card path rather than bespoke visuals.
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

### 2. Explicit Shrink Default And Wrap Alternate Stay Reviewable On The Shared Label Path
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-12/config.text-fit.yml`. On the main deck, compare key `0` with key `1`. Key `0` should keep a one-line shared label layout and visibly shrink the long text before any final clipping. Key `1` should visibly wrap that long label into multiple lines because the button opts into `fit: wrap`. The shared/default card chrome should otherwise stay consistent between the two keys.
fixture: `packages/cli/fixtures/phase-12/config.text-fit.yml`
result: pending
pass_if:
  - Key `0` remains on the one-line shrink path rather than jumping to multi-line layout.
  - Key `1` visibly wraps into multiple lines on the same shared/default card path.
  - The two keys differ because of fit behavior, not because one fell onto a bespoke variant path.
  - Existing bespoke variants such as analog clock and calendar sheet are unaffected by this review path.
fail_if:
  - `fit: wrap` still renders as the same one-line shrink behavior.
  - Removing `overflow` broke shared wrapper visuals or card chrome.
  - The review path accidentally depends on a bespoke renderer rather than the shared/default label path.

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0

## Gaps

Both checks still require human visual review on a real rendered surface.
