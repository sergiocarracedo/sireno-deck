# Plan 18-04 Summary

**Completed:** 2026-05-21
**Phase:** 18 — React DOM-Based Renderer With HTML/CSS Surface Support

## What was built
Wave 4 closes the phase with an honest rich-media story. TSX-authored buttons can now declare a `sample_interval_ms` hint, the hosted deck HTML carries that sampling metadata, and the browser renderer throttles repeated captures to that bound while still coalescing intermediate deck states down to the newest HTML.

The shipped surface now includes a bundled `media-demo` button authored as normal React TSX so sampled media behavior is reviewable without extra addon work. Phase 18 also now has the final UAT and verification artifacts, including the media-sampling fixture and an explicit statement that the migrated bundled buttons no longer ship through the old SVG helper path by default.

## Key files
- `packages/cli/src/deck/runtime.ts`: preserves root `sample_interval_ms` metadata from TSX-authored buttons onto the browser-hosted surface contract
- `packages/cli/src/render/dom-host.tsx`: stamps deck-level media sampling metadata into the hosted HTML
- `packages/cli/src/render/browser-renderer.ts`: throttles sampled captures while preserving latest-state coalescing
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-demo.ts`: adds a bundled sampled-media demo button with looping and one-shot behavior through plain TSX authoring
- `packages/cli/fixtures/phase-18/config.media-sampling.yml`: real-device review fixture for bounded sampled media
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-UAT.md`: now covers browser-rendered action, live TSX, and media-sampling fixtures
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-VERIFICATION.md`: final verification artifact for the browser/react-dom renderer replacement

## Decisions made
- Kept sampled media as bounded browser recapture driven by DOM metadata instead of promising continuous GIF/video playback.
- Used the lowest declared `sample_interval_ms` on the active DOM deck as the browser capture throttle so deck-level capture stays one shared operation.
- Proved sampled behavior with a bundled TSX button and deterministic frame labels rather than brittle visual snapshot-only assertions.

## Deviations from plan
- The contract extension stayed intentionally narrow: Wave 4 adds only `sample_interval_ms`, not a full generic media source API. That keeps the shipped promise aligned with what the runtime actually supports today.

## Notes for downstream
- Phase 18 now has code, fixtures, UAT, and verification artifacts for browser-backed TSX/react-dom rendering across static, live, and bounded sampled-media surfaces.
- The legacy SVG/text-image path still exists only as a compatibility seam for unmigrated or mixed decks, not as the shipped default for the bundled buttons covered by this phase.
