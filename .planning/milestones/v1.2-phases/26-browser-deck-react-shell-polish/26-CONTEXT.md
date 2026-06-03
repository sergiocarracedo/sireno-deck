# Phase 26: Browser Deck React Shell Polish - Context

**Gathered:** 2026-05-26
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Refactor the browser deck shell onto explicit React/TSX composition so the default button frame and the full browser deck page render through one honest shared React document tree for both browser capture and emulator serving. This phase also changes the undersized virtual-device contract from a hard error-only surface to a rendered visible subset plus persistent inline warning, adds moderate Stream Deck-inspired shell fidelity in browser mode, and keeps the pre-browser startup state simple by using `assets/logoFull.png` on the existing non-React startup seam. It does not introduce a second browser renderer, turn the browser shell into a photoreal hardware skin project, move startup waiting state onto a browser-only React path, or broaden theme `buttonFrame` ownership into outer shell layout invariants.

## Implementation Decisions

### React Boundary
- The whole browser deck document should become a React tree rather than keeping only button/frame internals as JSX.
- Browser capture mode and emulator mode should share one top-level document component.
- Final output may still stringify at the transport boundary, but Phase 26 should treat the page shell itself as one React composition surface.

### Undersized Virtual Device Policy
- If the selected virtual device has fewer keys than the configured deck needs, render the visible subset instead of failing with an error-only page.
- Show a persistent warning inside the shared deck document rather than in separate browser chrome.
- The warning should stay inline with the shell so the mismatch remains visible on the same honest browser-render path used for the deck itself.

### Browser Shell Fidelity
- Target moderate physical fidelity only.
- The browser shell should add bezel/chrome, real button gaps, empty button wells, and restrained glass/highlight treatment that reads like a Stream Deck without turning this phase into a photoreal skin exercise.
- Empty key positions should continue to render explicitly as part of the deck shell, not disappear when no button is configured.

### Startup Loading State
- The startup loading state should stay on the existing pre-browser startup seam rather than moving into the shared React deck document.
- Use `assets/logoFull.png` in a simpler loading card/state while the browser is starting.
- Do not require React/browser availability to show this startup state.

### Browser/Theme Boundary
- Theme `buttonFrame` continues to own button chrome only.
- Outer browser deck layout, warnings, bezel, shell spacing, and startup/loading treatment remain browser-shell responsibilities rather than theme responsibilities.
- Phase 26 should preserve the truthful Phase 25 theme runtime seam instead of re-scoping browser shell behavior into the theme package contract.

### Agent's Discretion
- Exact component/file split for the shared React deck document and shell subcomponents.
- Exact visual implementation details for moderate shell fidelity, as long as the result stays clearly more Stream Deck-like without becoming photoreal.
- Exact warning wording and placement details inside the shared document, as long as the warning is persistent and the visible subset still renders honestly.
- Exact pre-browser loading-card implementation details using `assets/logoFull.png`, as long as it stays outside the browser-only React path.

## Specific Ideas

- `packages/cli/src/render/button-frame.tsx` should become an honest JSX-authored component rather than a `createElement(...)` component file that only happens to have a `.tsx` extension.
- `packages/cli/src/render/dom-host.tsx` is the current document-shell seam and should likely become the main integration point for the shared React document-tree refactor.
- The browser shell should feel like a faithful product surface for empty and populated keys, not just a screenshot staging grid.
- The undersized-device warning should let emulator users keep working rather than dead-ending on an error screen, while still making the mismatch impossible to miss.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-CONTEXT.md`
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-CONTEXT.md`
- `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`
- `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`
- `.planning/phases/25-theme-tsx-button-frame-support/25-CONTEXT.md`
- `packages/cli/src/render/button-frame.tsx`
- `packages/cli/src/render/button-frame.test.tsx`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/render/dom-host.test.tsx`
- `packages/cli/src/render/browser-renderer.ts`
- `packages/cli/src/render/browser-renderer.test.ts`
- `packages/cli/src/render/startup-placeholder.ts`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/cli/commands/start.test.ts`
- `assets/logoFull.png`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/button-frame.tsx` already defines the default browser frame as a React component, but it still uses `createElement(...)` and only owns per-button chrome.
- `packages/cli/src/render/dom-host.tsx` already allocates one slot per key, wraps button content with `button.theme?.buttonFrame ?? defaultButtonFrame`, and assembles the full HTML document string for browser/emulator consumers.
- `packages/cli/src/render/browser-renderer.ts` remains the single browser transport/capture seam for both screenshot capture and emulator page serving.
- `packages/cli/src/render/startup-placeholder.ts` already owns startup waiting visuals before the browser is ready, but today it renders one repeated branded tile per hardware key instead of a `logoFull.png`-backed loading card.
- `packages/cli/src/cli/commands/start.ts` owns the current undersized-virtual-device policy and is the seam that presently swaps in the `Emulator Layout Error` HTML surface.

### Established Patterns
- Phase 18 and Phase 22 already committed the repo to one real browser renderer path rather than separate preview/demo shells.
- Phase 20 kept `buttonFrame` as button chrome rather than a theme-owned page layout system.
- Phase 23 kept startup placeholder behavior on a pre-browser seam controlled from startup/runtime, not a browser-only page component.
- Phase 24 kept runtime ownership in Node while React became the mounted view layer; Phase 26 should preserve that boundary even while broadening the browser document composition surface.
- Phase 25 already made the theme/default frame path honest for `.js/.jsx/.ts/.tsx`, so this phase should build on that truthful seam rather than bypassing it.

### Integration Points
- Refactor `packages/cli/src/render/dom-host.tsx` toward a shared React document component that both daemon/browser capture and emulator serving use before the final string serialization step.
- Update `packages/cli/src/cli/commands/start.ts` and adjacent browser/emulator state plumbing so undersized virtual devices render a subset plus inline warning instead of an error-only document.
- Keep `packages/cli/src/render/startup-placeholder.ts` as the pre-browser loading seam, but change its visual/content contract to use `assets/logoFull.png` in a simple loading card.
- Expand browser-shell tests in `dom-host.test.tsx`, `browser-renderer.test.ts`, and `start.test.ts` so the new document contract, warning behavior, and startup treatment are proved through the actual shipped path.

## Deferred Ideas

- Photoreal browser hardware rendering with heavy reflections/depth/material simulation.
- Making startup waiting state depend on the browser React page being available before any visual feedback appears.
- Handing outer deck layout or warning UI ownership to themes.
- Reintroducing a hard error-only undersized-device page for this first shell-polish phase.

---
*Phase: 26-browser-deck-react-shell-polish*
*Context gathered: 2026-05-26*
