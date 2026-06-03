---
status: verified
phase: 19-tailwind-button-theming-css-vars
verified_at: 2026-05-23T13:45:00+02:00
artifacts:
  - packages/cli/src/render/button-frame.tsx
  - packages/cli/src/addon/api.ts
  - packages/cli/fixtures/phase-19/config.theme-typography.yml
  - .planning/phases/19-tailwind-button-theming-css-vars/19-UAT.md
  - /tmp/opencode/phase19-review/theme-token-utilities-main.png
  - /tmp/opencode/phase19-review/theme-token-utilities-light.png
  - /tmp/opencode/phase19-review/theme-typography-main.png
  - /tmp/opencode/phase19-review/theme-typography-dark-review.png
commands:
  - pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx src/render/button-frame.test.tsx src/builtin-addons/date-time/index.test.ts src/builtin-addons/core-buttons/index.test.ts
---

# Phase 19 Verification

- `buttonFrame` now consumes the theme bridge instead of fixed dark chrome, using the Phase 19 CSS variables on the shared framed browser path.
- `createDomTextLabel` and `createDomStack` stay plain React helpers, but their default output now aligns with className-first themed authoring through `font-main`, `text-foreground`, and additive `className`/`style` overrides.
- Shipped browser surfaces prove the contract in more than one place: action, analog clock, and calendar sheet all render with theme-token classes.
- `packages/cli/fixtures/phase-19/config.theme-typography.yml` provides a real browser review path where theme typography and shared frame differences are visible while navigating between decks.

## Verification Performed In This Session

- Focused automated verification passed for the Phase 19 code paths and helper/browser-surface integration.
- A one-off headless browser review was run against the committed Phase 19 fixtures and wrote review captures to `/tmp/opencode/phase19-review/`:
  - `theme-token-utilities-main.png`
  - `theme-token-utilities-light.png`
  - `theme-typography-main.png`
  - `theme-typography-dark-review.png`
- The host also reports one attached Stream Deck device (`originalv2`, `/dev/hidraw3`), so the committed UAT commands are runnable on hardware.
- Physical on-device visual confirmation was completed with user review on the attached Stream Deck.

## Real-Device UAT Outcome

- Fixture 1 (`config.theme-token-utilities.yml`) passed on the attached device: themed text/chrome tracked the active theme and deck switching left no stale pixels.
- Fixture 2 (`config.theme-typography.yml`) passed on the attached device: shared frame chrome followed the active theme, typography-role differences were visibly reviewable across decks, and navigation remained clean.

## Why It Broke Before

- Phase 19 Wave 1 exported CSS variables and utility classes, but the legacy helper layer still baked color and typography inline.
- That meant addons using helpers could silently bypass the new contract, making typography changes hard to review on real shipped surfaces.

## What We Learned

- Exporting theme tokens is not enough if the default helper path still hardcodes presentation.
- The safe bridge is additive: helpers should emit stable theme-role classes by default and still allow direct `className` authoring without inventing a parallel DSL.
