# Phase 26 Verification

**Date:** 2026-05-27
**Status:** passed

## Verification Summary

Phase 26 passed verification. The browser deck now renders through one shared React document tree while still shipping an HTML-string transport boundary, undersized virtual-device selections now render the visible subset with a persistent inline warning instead of an error-only page, and the startup placeholder stays on the pre-browser seam while using a deck-wide `logoFull.png` treatment instead of repeated identical tiles.

## Must-Have Checks

### 26-01
- Passed: `packages/cli/src/render/button-frame.tsx` is now an honest JSX-authored button-frame component without expanding ownership into outer shell layout.
- Passed: `packages/cli/src/render/dom-host.tsx` renders the deck document through one shared React tree and still stringifies only at the final transport boundary.
- Passed: the shared shell now exposes explicit shell/well markers and stable all-slot rendering while preserving theme utility/styles injection and theme-owned frame wrapping.

### 26-02
- Passed: undersized virtual-device selections now render the visible subset instead of swapping to a hard error-only page.
- Passed: the mismatch remains explicit through `emulator_layout_mismatch` state and a persistent inline warning banner inside the shared deck document.
- Passed: focused emulator/start and host tests prove the contract shift intentionally and keep the warning on the real browser/emulator path.

### 26-03
- Passed: `packages/cli/src/render/startup-placeholder.ts` now uses `logoFull.png` on the existing pre-browser buffer-rendering seam instead of repeated `SIRENO / STARTING` tiles.
- Passed: startup placeholder output is now deck-wide and non-repeating across keys, while still returning one raw key buffer per requested key.
- Passed: the existing startup handoff tests still prove placeholder-before-first-render behavior and failure-path cleanup on the original startup seam.

## Evidence

- `pnpm --filter sireno-deck-cli exec vitest run src/render/button-frame.test.tsx`
  - `2 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/render/button-frame.test.tsx src/render/dom-host.test.tsx src/cli/commands/start.test.ts src/render/startup-placeholder.test.ts -t "renders a full deck document with stable key slots|exports theme CSS vars and the browser utility stylesheet on the deck root|renders a persistent inline warning banner inside the shared deck shell when requested|renders the visible subset with an inline warning when the selected virtual device cannot represent the configured deck|writes placeholder buffers before the first real render and clears the pending state after handoff|clears the placeholder if the first real render fails|creates one raw key buffer per requested key|uses a deck-wide logo treatment instead of repeating the same tile on every key"`
  - `8 passed | 33 skipped`
  - note: mocked failure-path test still prints expected `Error: capture failed` stderr while passing
- `rg -n "data-sireno-browser-shell|data-sireno-key-well|data-sireno-empty-key|data-sireno-inline-warning|getThemeCssVariables" packages/cli/src/render/dom-host.tsx packages/cli/src/render/dom-host.test.tsx`
  - shared-shell markers, empty-well markers, inline warning marker, and theme-css-variable plumbing present in code and focused tests
- `rg -n "emulator_layout_mismatch|Layout mismatch|createDeckHtml\(|inlineWarning|status = \"ready\"" packages/cli/src/cli/commands/start.ts packages/cli/src/cli/commands/start.test.ts`
  - mismatch now feeds the shared deck document, warning text is explicit, and undersized-device state stays `ready`
- `rg -n "logoFull|createStartupPlaceholderBuffers|createStartupPlaceholderDeckBuffer|STARTUP_LOGO_FULL_PATH" packages/cli/src/render/startup-placeholder.ts packages/cli/src/render/startup-placeholder.test.ts`
  - startup placeholder now resolves the shipped logo and composes a deck-wide placeholder path with focused test coverage

## Residual Notes

- Phase 26 is post-roadmap follow-on work and does not add a new v1.2 requirement ID; `REQUIREMENTS.md` remains milestone-scoped.
- Verification here is automated only. The next workflow step is `verify-work 26` for manual UAT, then `/review`, `/ship`, and `/compound`.
