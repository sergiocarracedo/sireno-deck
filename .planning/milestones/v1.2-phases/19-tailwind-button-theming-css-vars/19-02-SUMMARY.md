# Plan 19-02 Summary

**Completed:** 2026-05-23

## What was built
Phase 19 now affects the shared shipped browser surface instead of stopping at a single proof button. `ButtonFrame` consumes the Phase 19 theme bridge, the default helper path emits themed typography classes instead of hardcoded inline font/color styling, and the repo now includes a committed typography review fixture plus final verification artifact for the browser-rendered path.

## Key files
- `packages/cli/src/render/button-frame.tsx`: shared browser button chrome now follows theme CSS variables instead of fixed dark gradients.
- `packages/cli/src/addon/api.ts`: helper output now defaults to stable themed classes such as `font-main` and `text-foreground`, while still allowing additive `className` and `style` overrides.
- `packages/cli/src/index.ts`: re-exports the helper surface type for className/style-capable DOM helper authoring.
- `packages/cli/src/builtin-addons/date-time/index.ts`: analog clock and calendar sheet provide a second shipped proof for theme-token classes and typography roles.
- `packages/cli/fixtures/phase-19/config.theme-typography.yml`: committed browser review fixture for typography- and frame-level theming.
- `.planning/phases/19-tailwind-button-theming-css-vars/19-UAT.md`: extended with a typography/shared-frame browser review script.
- `.planning/phases/19-tailwind-button-theming-css-vars/19-VERIFICATION.md`: final Phase 19 verification artifact.

## Decisions made
- Kept the helper bridge additive instead of creating a second authoring DSL: plain React `className` remains primary, helpers just stop fighting the theme contract.
- Left layout-critical inline styles in place where they express structure, but moved theme-owned presentation back onto CSS-variable-backed classes.

## Why it broke before
- Wave 1 exported theme CSS vars and utilities, but the default helper path still hardcoded typography and color inline.
- That meant real shipped surfaces could bypass the new theme bridge even when tests for the utility layer itself were green.

## Notes for downstream
- Phase 19 execution is complete and focused verification is green.
- Headless browser-path review also passed in-session, with captures written to `/tmp/opencode/phase19-review/` for both Phase 19 fixtures.
- Real-device UAT also passed on the attached Stream Deck, so Phase 19 is now fully verified.
