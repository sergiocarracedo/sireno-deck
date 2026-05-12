# Plan 04-01 Summary

**Completed:** 2026-05-12

## What was built
Added Phase 4 toggle button support to the config schema and runtime. Internal toggles now cycle by state order and run the newly active state's command, while external toggles keep their rendered state authoritative from `status_command` polling. The runtime polling lifecycle was also fixed so schedulers stop for inactive decks and restart for the newly active deck after navigation.

## Key files
- `packages/cli/src/core/schemas.ts`: adds the built-in `toggle` button schema and shared `states[]` validation
- `packages/cli/src/deck/runtime.ts`: adds toggle behavior plus active-deck-aware polling start/stop logic
- `packages/cli/src/render/reconciler.ts`: widens the button render payload for richer toggle visuals
- `packages/cli/src/render/text-image.ts`: renders toggle badge metadata in the existing SVG -> sharp pipeline
- `packages/cli/src/deck/runtime.test.ts`: covers internal cycling, external authority, and polling lifecycle restart behavior

## Decisions made
- Kept the richer render payload minimal: `subtitle` and `variant` were enough for the first advanced-button slice without introducing a separate layout engine.
- Reused the existing command executor for toggle commands and external status refreshes rather than adding a second command boundary.

## Deviations
- `04-01-02` and `04-01-03` were verified together through the updated runtime/render tests and the full CLI test suite because the runtime payload change and the new tests are tightly coupled. No scope deviation beyond that bundling.

## Notes for downstream
- `runtime.ts` now owns active-deck polling lifecycle explicitly, so the CPU/memory/fan/media plans should plug into that path rather than starting ad-hoc schedulers.
- The render payload is wider than Phase 3 but still intentionally small; only add more fields in later plans if the richer built-in layouts genuinely need them.
