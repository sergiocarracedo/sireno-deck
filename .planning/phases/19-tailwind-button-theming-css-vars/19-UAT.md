---
status: complete
phase: 19-tailwind-button-theming-css-vars
source:
  - 19-01-PLAN.md
started: 2026-05-23T11:45:00+02:00
updated: 2026-05-23T13:45:00+02:00
---

# Phase 19 UAT — Theme Token Utilities on Browser Buttons

## Current Test
number: 2
name: Theme typography and shared frame on the browser path
expected: |
  Run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-19/config.theme-typography.yml`.
  The shared `buttonFrame` chrome should follow the active theme, the light `main` deck and dark `dark-review` deck should show visibly different typography and color treatment, the `Clock`/`LIVE` and `Date`/`SHEET` pairs should reflect the typography-role contract, and switching decks should leave no stale browser pixels.
awaiting: complete

## Fixture 1 — Theme token utility classes on the browser path

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-19/config.theme-token-utilities.yml`
fixture: `packages/cli/fixtures/phase-19/config.theme-token-utilities.yml`
pass_if:
- The primary action button visibly renders through browser-backed HTML/CSS rather than fallback imagery.
- The action button label uses the active Sireno theme primary color through the `text-primary` utility mapping.
- The action card chrome uses the theme-backed background and accent border instead of fixed hardcoded colors.
- Navigating between the dark and light review decks changes the themed surface without stale pixels.
fail_if:
- `text-primary` does not visibly track the active Sireno theme.
- The button still appears to use only fixed inline colors unrelated to the active theme.
- Navigation leaves stale browser-rendered content behind.
result: pass

## Fixture 2 — Theme typography and shared frame on the browser path

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-19/config.theme-typography.yml`
fixture: `packages/cli/fixtures/phase-19/config.theme-typography.yml`
pass_if:
- The framed action button, analog clock, and calendar sheet all render through the browser path with shared `buttonFrame` chrome that follows the active theme.
- The light-theme main deck shows visibly different typography from the dark review deck because `font-main` and `font-aux` resolve from theme CSS variables.
- Typography-role differences remain visible on shipped surfaces, especially the analog clock `Clock`/`LIVE` pair and calendar `Date`/`SHEET` pair.
- Moving between `main` and `dark-review` updates both color and type treatment without stale browser pixels.
fail_if:
- Helper-authored labels still look locked to hardcoded inline typography regardless of active theme.
- The shared frame still appears as a fixed dark shell when the light theme is active.
- `theme`, `typography`, `text-primary`, or `buttonFrame` differences are only documented and not visible on real buttons.
result: pass

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
