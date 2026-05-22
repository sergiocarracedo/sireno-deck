# Phase 18 Verification — React DOM Renderer With HTML/CSS Surface Support

status: complete

## Current outcome

- Automated verification is passing for the Phase 18 code path and fixtures.
- Manual device UAT passed for the browser-rendered action, live TSX, and sampled-media fixtures.
- No known implementation or procedural blocker remains for Phase 18 verification.

## Must-have coverage

1. Browser-backed React TSX rendering is the shipped path for the bundled Phase 18 buttons covered by this phase.
   Evidence:
   - `packages/cli/src/cli/commands/start.ts` sends all browser-content decks through `renderDomDeckSurface()` and `createBrowserRenderer()`.
   - Bundled `action`, `change-deck`, `toggle`, `date-time`, `analog-clock`, `calendar-sheet`, and `media-demo` buttons now return plain React TSX instead of the legacy compatibility wrapper.
   - `packages/cli/src/builtin-addons/core-buttons/index.test.ts` asserts plain TSX render output for shipped core buttons.

2. `buttonFrame` is applied implicitly unless a button explicitly opts into `full_surface`.
   Evidence:
   - `packages/cli/src/render/dom-host.tsx` wraps DOM buttons with `createHostedButtonElement()`.
   - `packages/cli/src/render/dom-host.test.tsx` proves default framing and explicit `full_surface` opt-out.

3. Live TSX invalidation stays coherent at the deck level.
   Evidence:
   - `packages/cli/src/deck/runtime.ts` rerenders the full active browser-backed deck when a TSX-authored button invalidates or refreshes.
   - `packages/cli/src/render/browser-renderer.ts` keeps only the latest pending browser capture.
   - `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-UAT.md` Fixture 2 covers real-device validation for live TSX buttons.

4. Rich media is supported as bounded sampled capture, not continuous playback.
   Evidence:
   - `packages/cli/src/deck/runtime.ts` preserves root `sample_interval_ms` metadata from TSX-authored buttons onto the browser-hosted surface contract.
   - `packages/cli/src/render/dom-host.tsx` stamps `data-sireno-media-sample-interval-ms` into the hosted deck HTML.
   - `packages/cli/src/render/browser-renderer.ts` throttles repeated captures to the declared sample interval while still coalescing to the latest deck HTML.
   - `packages/cli/src/render/browser-renderer.test.ts` verifies throttled sampled capture behavior.
   - `packages/cli/fixtures/phase-18/config.media-sampling.yml` provides a reviewable real-device fixture.

## Explicit non-goals

- Phase 18 does not promise continuous GIF or video playback on-device.
- Mixed browser-content and legacy SVG decks still use the compatibility render path until later migration work removes it completely.

## Residual compatibility seam

- The old SVG/text-image helper path still exists as a compatibility seam for legacy `deck-*` or otherwise non-browser buttons.
- For the bundled buttons migrated in Phase 18, that path is no longer the shipped default.

## Verification checklist

- `pnpm --filter sireno-deck-cli exec vitest run src/render/button-frame.test.tsx src/render/dom-host.test.tsx`
- `pnpm --filter sireno-deck-cli exec vitest run src/render/browser-renderer.test.ts src/builtin-addons/core-buttons/index.test.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/builtin-addons/date-time/index.test.ts src/cli/commands/start.test.ts`
- Manual UAT against:
  - `fixtures/phase-18/config.browser-rendered-action.yml`
  - `fixtures/phase-18/config.live-dom-buttons.yml`
  - `fixtures/phase-18/config.media-sampling.yml`
