# Plan 18-01 Summary

**Completed:** 2026-05-22

## What was built
Phase 18 now has a real browser-backed rendering seam instead of a design sketch. The CLI starts a persistent Chromium renderer through Playwright, renders deck surfaces through `react-dom/server`, captures the full deck once, and crops per-key buffers for device writes.

This first slice also moved the first shipped builtin path onto ordinary React DOM output. The bundled `action` and `change-deck` buttons now render as normal TSX content hosted inside the browser deck surface, and daemon startup fails honestly if the browser renderer cannot start.

## Key files
- `packages/cli/src/render/browser-renderer.ts`: long-lived Chromium/page lifecycle plus per-key buffer capture.
- `packages/cli/src/render/render-preset.ts`: shared deck geometry extracted out of the old renderer seam.
- `packages/cli/src/render/dom-host.tsx`: server-rendered HTML deck host with default frame handling.
- `packages/cli/src/render/button-frame.tsx`: shared framed button chrome for non-full-surface content.
- `packages/cli/src/cli/commands/start.ts`: browser renderer startup is now required on the live daemon path.
- `packages/cli/src/deck/runtime.ts`: preserves DOM-backed addon output and forces full-deck rerenders for browser-owned surfaces.
- `packages/cli/fixtures/phase-18/config.browser-rendered-action.yml`: first committed browser-rendered review fixture.

## Decisions made
- Put browser ownership at the deck surface level, not per-key, so invalidation can stay simple and truthful.
- Kept runtime lifecycle ownership in `deck/runtime.ts` and moved HTML capture/cropping into the browser renderer seam.
- Removed browserless startup fallback immediately instead of introducing a second temporary startup mode.

## Deviations
- None.

## Notes for downstream
- Wave 1 still left the legacy SVG/text-image path in the repo for unmigrated surfaces; Wave 2 is where that compatibility drag gets deleted for real.
- The browser-backed path is now the live daemon contract, so later work should extend that path rather than adding another renderer seam.
