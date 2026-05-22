# Plan 18-03 Summary

**Completed:** 2026-05-21
**Phase:** 18 — React DOM-Based Renderer With HTML/CSS Surface Support

## What was built
Wave 3 proved the browser renderer can handle live buttons instead of only static ones. The browser renderer now uses one bounded capture loop, coalesces intermediate updates down to the newest active deck state, and only captures the final current deck when updates arrive faster than screenshots complete.

Bundled live buttons also moved onto the browser/react-dom path without moving ownership out of runtime. Toggle buttons now return normal React TSX with explicit state markers, date/time widgets continue to update from runtime-owned polling, and runtime now re-renders the full browser-backed deck surface when a live TSX button invalidates itself so captured decks stay coherent.

## Key files
- `packages/cli/src/render/browser-renderer.ts`: adds the bounded capture loop, versioned latest-state tracking, and coalesced screenshot fulfillment
- `packages/cli/src/render/browser-renderer.test.ts`: proves stale intermediate HTML states are dropped and the newest deck state wins
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts`: migrates bundled toggles to plain TSX render output with visible state markers
- `packages/cli/src/deck/runtime.ts`: keeps runtime ownership of invalidation and polling while forcing full-deck browser rerenders when live TSX buttons change and keeping legacy `deck-*` elements on the fallback-only path
- `packages/cli/src/deck/runtime.test.ts`: verifies live TSX toggle behavior, reconnect-style activation, and the fallback/browser contract split after invalidation
- `packages/cli/fixtures/phase-18/config.live-dom-buttons.yml`: review fixture for live toggle and date/time browser-backed behavior

## Decisions made
- Kept capture scheduling inside the browser renderer instead of teaching runtime about queueing; runtime still owns when state changes, renderer owns how captures are bounded.
- Re-rendered the full browser deck surface after live TSX button invalidation so browser-backed decks cannot drift into mixed stale/current key states.
- Kept legacy `deck-button` / `deck-surface` / `deck-text` elements explicitly on the fallback-only path instead of silently treating them as browser TSX.
- Used explicit `data-sireno-toggle-*` markers in TSX toggle output so tests can assert live state transitions without depending on brittle visual snapshots.

## Deviations from plan
- Runtime verification had to preserve the split between true browser TSX and legacy fallback descriptions; not every existing `deck-button` render should be rewritten as browser content just because Phase 18 moved bundled live buttons to TSX.

## Notes for downstream
- Wave 4 can now focus on bounded media sampling and final browser-backed UAT with live-state buttons already exercising the recapture path.
- Mixed legacy/SVG fallback still exists, but live bundled buttons now cover both static and stateful browser-backed paths without blurring the fallback/browser seam.
