# Plan 18-01 Summary

**Completed:** 2026-05-21
**Phase:** 18 — React DOM-Based Renderer With HTML/CSS Surface Support

## What was built
Wave 1 shipped the first real browser-backed rendering slice for Phase 18. The repo now has a persistent Chromium renderer seam, a DOM host that builds a full active-deck HTML document, and a real React `buttonFrame` component that wraps DOM buttons by default unless `full_surface: true` opts out.

The first shipped DOM path now covers bundled `action` and `change-deck` buttons. `start.ts` keeps runtime ownership where it belonged, switches to browser capture only when the whole active deck is on the DOM path, and still writes cropped per-key buffers through the existing device seam.

## Key files
- `packages/cli/src/render/browser-renderer.ts`: persistent browser/context/page seam plus deck screenshot cropping into per-key raw buffers
- `packages/cli/src/render/dom-host.tsx`: serializes DOM-authored button content into a full active-deck HTML document and applies `buttonFrame` by default
- `packages/cli/src/render/button-frame.tsx`: shared React frame component for default DOM-backed buttons
- `packages/cli/src/deck/runtime.ts`: carries DOM render output through runtime without moving lifecycle ownership out of runtime
- `packages/cli/src/cli/commands/start.ts`: initializes the browser renderer and routes DOM-only active decks through browser capture while preserving legacy fallback for mixed decks
- `packages/cli/fixtures/phase-18/config.browser-rendered-action.yml`: first real device fixture for browser-rendered action/change-deck behavior
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-UAT.md`: first Phase 18 UAT script for browser-backed DOM deck review

## Decisions made
- Kept Wave 1 narrow: browser rendering only activates when the whole active deck is on the new DOM path; mixed decks still fall back to the legacy path until broader migration lands.
- Made the browser renderer injectable so tests can verify persistent page reuse and per-key cropping without launching real Chromium.
- Preserved runtime ownership of navigation, invalidation, polling, and key writes; the browser seam only owns HTML capture and cropping.

## Deviations from plan
- Added a worktree-local `pnpm install` before verification because the fresh execution worktree had no dependencies installed, so task-level verification commands were not runnable otherwise.
- Kept the legacy start-path fallback alive for non-DOM decks in Wave 1 rather than forcing a half-migrated compatibility shim across the full button surface.

## Notes for downstream
- Wave 2 should demote the old `DeckButtonProps` authoring center more aggressively now that the first shipped DOM path is real.
- `STATE.md` and `ROADMAP.md` were stale before execution; downstream planning docs should be brought back in sync as part of the phase-level closeout.
