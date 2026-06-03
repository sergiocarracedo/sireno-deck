# Plan 19-01 Summary

**Completed:** 2026-05-23

## What was built
Phase 19 now has a real browser-surface theme bridge instead of hardcoded color-only DOM styling. The browser deck shell exports the resolved Sireno theme as namespaced CSS variables, injects a narrow utility stylesheet for theme-token classes such as `text-primary`, and the first shipped action button now consumes that contract on the real browser-rendered path.

This first slice also added the committed Phase 19 review fixture and UAT script so the new theming seam is reviewable on-device instead of living only in tests.

## Key files
- `packages/cli/src/render/theme-utilities.ts`: derives CSS variables and the narrow theme-token utility stylesheet from the resolved Sireno theme.
- `packages/cli/src/render/dom-host.tsx`: injects the CSS variables and utility stylesheet into the browser deck shell.
- `packages/cli/src/cli/commands/start.ts`: threads the resolved runtime theme into the browser deck render path.
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.ts`: first shipped builtin button using the theme-token utility contract.
- `packages/cli/fixtures/phase-19/config.theme-token-utilities.yml`: review fixture for themed browser buttons.
- `.planning/phases/19-tailwind-button-theming-css-vars/19-UAT.md`: review script for the first Phase 19 proof.

## Decisions made
- Kept `packages/cli/src/config/theme.ts` as the single source of truth and exported browser CSS vars from the resolved runtime theme instead of inventing a second Tailwind-style token registry.
- Implemented a Sireno-owned utility layer with Tailwind-shaped class names on the browser surface instead of introducing a full Tailwind build pipeline into the CLI package.

## Deviations
- `packages/cli/src/cli/commands/start.ts` needed a narrow call-site change to pass the resolved runtime theme into `renderDomDeck()`. The plan did not list it in the first task's file block, but the theme could not reach the browser shell otherwise.

## Notes for downstream
- `ButtonFrame` and the core DOM helpers still hardcode shared visual styling and need the Wave 2 migration so the theme bridge affects the default browser chrome, not just the first proof button.
- The current Phase 19 fixture proves color-token theming; Wave 2 still needs the typography-visible proof path.
