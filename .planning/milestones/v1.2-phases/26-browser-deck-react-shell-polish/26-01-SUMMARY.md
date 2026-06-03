# Plan 26-01 Summary

**Completed:** 2026-05-27

## What was built
Moved the browser deck page onto one shared React document tree while preserving the existing HTML-string transport contract. `packages/cli/src/render/button-frame.tsx` is now an honest JSX-authored component, and `packages/cli/src/render/dom-host.tsx` now renders the full deck document through React before stringifying at the final `renderToStaticMarkup(...)` boundary.

This slice also added moderate shell fidelity inside the existing deck footprint instead of inventing a second renderer or wrapper page. The deck document now carries explicit shell markers, restrained bezel/well chrome, and stable empty-slot rendering for every key position while preserving theme utility/styles injection, theme-owned `buttonFrame` wrapping, and `full_surface` behavior.

## Key files
- `packages/cli/src/render/button-frame.tsx`: converted the default frame from `createElement(...)` form into explicit JSX while keeping button-chrome ownership and the existing frame-state contract intact.
- `packages/cli/src/render/dom-host.tsx`: replaced the string-assembled document shell with a shared React document tree, added explicit shell/well markers, and preserved the final HTML-string boundary.
- `packages/cli/src/render/dom-host.test.tsx`: updated focused host tests to prove the shared shell/document markers, explicit empty wells, and the stable document contract without pinning unrelated theme-token drift.

## Decisions made
- Kept `renderToStaticMarkup(...)` as the transport boundary so browser-renderer capture/emulator serving did not need a second document model.
- Kept theme `buttonFrame` ownership narrow to button chrome only; outer shell chrome and empty wells remain deck-document responsibilities.
- Kept shell polish inside the existing deck-root footprint so browser screenshot cropping stays aligned with the current renderer assumptions.

## Notes for downstream
- The shared deck document is now the honest seam for both browser capture and emulator-served deck HTML.
- Wave 2 can thread inline warning state through the same document without introducing emulator-only page chrome or a parallel mismatch renderer.
