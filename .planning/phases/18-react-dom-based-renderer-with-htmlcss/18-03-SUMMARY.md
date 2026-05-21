# Plan 18-03 Summary

**Completed:** 2026-05-21
**Phase:** 18 — React DOM-Based Renderer With HTML/CSS Surface Support

## What was built
Wave 3 proved the browser renderer can handle live buttons instead of only static ones. The browser renderer now uses one bounded capture loop, coalesces intermediate updates down to the newest active deck state, and only captures the final current deck when updates arrive faster than screenshots complete.

Bundled live buttons also moved onto the DOM path without moving ownership out of runtime. Toggle buttons now render DOM content with explicit state markers, date/time widgets continue to update from runtime-owned polling, and runtime now re-renders the full DOM deck surface when a live DOM button invalidates itself so browser-backed decks stay coherent.

## Key files
- `packages/cli/src/render/browser-renderer.ts`: adds the bounded capture loop, versioned latest-state tracking, and coalesced screenshot fulfillment
- `packages/cli/src/render/browser-renderer.test.ts`: proves stale intermediate HTML states are dropped and the newest deck state wins
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.ts`: migrates bundled toggles to DOM-authored render output with visible state markers
- `packages/cli/src/deck/runtime.ts`: keeps runtime ownership of invalidation and polling while forcing full-deck DOM rerenders when live DOM buttons change
- `packages/cli/src/deck/runtime.test.ts`: verifies live DOM toggle behavior, reconnect-style activation, and deck-wide rerender after invalidation
- `packages/cli/fixtures/phase-18/config.live-dom-buttons.yml`: review fixture for live toggle and date/time browser-backed behavior

## Decisions made
- Kept capture scheduling inside the browser renderer instead of teaching runtime about queueing; runtime still owns when state changes, renderer owns how captures are bounded.
- Re-rendered the full DOM deck surface after live DOM button invalidation so browser-backed decks cannot drift into mixed stale/current key states.
- Used explicit `data-sireno-toggle-*` markers in DOM toggle output so tests can assert live state transitions without depending on brittle visual snapshots.

## Deviations from plan
- Expanded runtime tests beyond the exact task file list because existing assertions still assumed legacy text-description toggle output and would otherwise give false regressions once live toggles moved to DOM content.

## Notes for downstream
- Wave 4 can now focus on bounded media sampling and final browser-backed UAT with live-state buttons already exercising the DOM recapture path.
- Mixed legacy/SVG fallback still exists, but live bundled buttons now cover both static and stateful browser-backed paths.
