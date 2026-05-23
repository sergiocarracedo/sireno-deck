---
status: ready_for_review
phase: 19-tailwind-button-theming-css-vars
source:
  - 19-01-PLAN.md
started: 2026-05-23T11:45:00+02:00
updated: 2026-05-23T11:45:00+02:00
---

# Phase 19 UAT — Theme Token Utilities on Browser Buttons

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
