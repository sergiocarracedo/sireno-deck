# Phase 26 Verification

**Date:** 2026-05-27
**Status:** gaps_found

## Verification Summary

Phase 26's original automated verification passed, but manual UAT found one upstream runtime blocker that invalidated the shipped CLI/emulator path: `packages/cli/src/render/dom-host.tsx` and `packages/cli/src/render/button-frame.tsx` were moved onto JSX syntax without a compatible runtime `React` value on the real `tsx` execution path. That blocker was fixed by `26-04-PLAN.md`, and the rerun UAT now confirms the shared shell plus undersized-device warning path work on the real runtime seam. One narrower visual gap remains: the startup placeholder still showed extra shell/card/`STARTING` overlay artwork on top of `logoFull.png` instead of only the full-deck logo image. That remaining rerun gap is now tracked by closure plan `26-05-PLAN.md`.

## Must-Have Checks

### 26-01
- Automated pass retained: `packages/cli/src/render/button-frame.tsx` is an honest JSX-authored button-frame component without expanding ownership into outer shell layout.
- Automated pass retained: `packages/cli/src/render/dom-host.tsx` renders the deck document through one shared React tree and still stringifies only at the final transport boundary.
- Gap found in manual UAT: the real CLI/emulator `tsx` runtime still required a runtime `React` value in scope, so both `ButtonFrame(...)` and `renderDomDeck(...)` crashed with `ReferenceError: React is not defined` outside Vitest transforms.

### 26-02
- Automated pass retained: undersized virtual-device selections now render the visible subset instead of swapping to a hard error-only page.
- Automated pass retained: the mismatch remains explicit through `emulator_layout_mismatch` state and a persistent inline warning banner inside the shared deck document.
- Blocked in manual UAT by the same upstream JSX runtime failure before the warning path could render on the real emulator path.

### 26-03
- Automated pass retained: `packages/cli/src/render/startup-placeholder.ts` now uses `logoFull.png` on the existing pre-browser buffer-rendering seam instead of repeated `SIRENO / STARTING` tiles.
- Automated pass retained: startup placeholder output is now deck-wide and non-repeating across keys, while still returning one raw key buffer per requested key.
- Original manual UAT was first blocked by the same upstream JSX runtime failure when startup handed off from placeholder buffers to the first real browser-backed deck render.
- Rerun UAT after `26-04` confirmed the startup path no longer crashes, but surfaced a narrower visual mismatch: the placeholder composition still included extra shell/card/`STARTING` overlay artwork instead of only the full-deck `logoFull.png` image.

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
- `pnpm exec tsx --eval "(async () => { const { renderDomDeck } = await import('./packages/cli/src/render/dom-host.tsx'); console.log(typeof renderDomDeck); console.log(renderDomDeck([], { keyCount: 1 }).slice(0, 40)); })().catch((error) => { console.error(error); process.exit(1); });"`
  - reproduced the real CLI/runtime failure before the gap-closure fix: `ReferenceError: React is not defined at renderDomDeck (.../dom-host.tsx:581:5)`
- `pnpm exec tsx --eval "(async () => { const { ButtonFrame } = await import('./packages/cli/src/render/button-frame.tsx'); const element = ButtonFrame({ children: null, state: 'idle' }); console.log(element?.props?.['data-sireno-button-frame']); })().catch((error) => { console.error(error); process.exit(1); });"`
  - reproduced the same runtime-seam failure in the default frame component: `ReferenceError: React is not defined at ButtonFrame (.../button-frame.tsx:9:3)`
- `.planning/phases/26-browser-deck-react-shell-polish/26-UAT-rerun-2026-05-27.md`
  - rerun UAT result: `2 passed, 1 issue`
  - confirmed browser shell and undersized-device warning path now pass on the real CLI/emulator seam after `26-04`
  - remaining issue is startup-placeholder visuals: user reported it should show only the full-deck `logoFull.png` image and no extra elements

## Residual Notes

- Phase 26 is post-roadmap follow-on work and does not add a new v1.2 requirement ID; `REQUIREMENTS.md` remains milestone-scoped.
- The original shared runtime blocker was fixed by `.planning/phases/26-browser-deck-react-shell-polish/26-04-PLAN.md`, but rerun UAT found one remaining startup-placeholder visual gap now tracked in `.planning/phases/26-browser-deck-react-shell-polish/26-05-PLAN.md`.
- After implementing `26-05-PLAN.md`, rerun `verify-work 26` again before `/review`, `/ship`, and `/compound`.
