# Plan 26-02 Summary

**Completed:** 2026-05-27

## What was built
Changed undersized virtual-device handling from a hard error-only surface to a usable-but-honest shared-shell path. When the selected virtual device exposes fewer keys than the configured deck needs, Sireno now renders the visible subset on the normal deck document seam and shows a persistent inline warning banner instead of replacing the deck with an `Emulator Layout Error` page.

This slice deliberately preserved honesty instead of silently clipping or auto-switching devices. The mismatch still survives in emulator state as `emulator_layout_mismatch`, but the browser shell stays usable and makes the mismatch impossible to miss inside the same shared deck document.

## Key files
- `packages/cli/src/render/dom-host.tsx`: added shared-shell inline warning support through `inlineWarning` and rendered the banner inside `#deck-root` before the visible key wells.
- `packages/cli/src/cli/commands/start.ts`: changed the undersized-device branch to feed warning state into `createDeckHtml(...)`, keep mismatch metadata in `surfaceState.error`, and keep the surface `ready` instead of swapping to an error-only page.
- `packages/cli/src/cli/commands/start.test.ts`: replaced the old hard-failure assertion with focused coverage for visible subset rendering plus persistent inline warning.
- `packages/cli/src/render/dom-host.test.tsx`: added focused proof that the warning banner lives inside the shared shell and spans the visible subset path.

## Decisions made
- Preserved `emulator_layout_mismatch` as explicit state so usable rendering does not become hidden clipping.
- Kept the warning inline inside the shared deck shell instead of pushing it into emulator-only outer chrome.
- Reused the existing `renderDomDeck(...)` seam rather than creating a separate mismatch page or alternate document path.

## Notes for downstream
- The old Phase 22 hard-error policy is intentionally replaced and now locked by focused tests.
- Future shell polish should treat the inline warning banner as part of the shared document contract, not as a special emulator-only overlay.
