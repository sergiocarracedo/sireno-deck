# Plan 03-03 Summary

**Completed:** 2026-05-12

## What was built
Phase 3 now has real deck navigation. The config schema accepts `change-deck` buttons and validates that their targets exist, a dedicated deck controller owns the active deck stack, and the runtime can navigate into sub-decks and return through an automatically generated back button. Startup now boots the runtime against the full deck map and re-renders the currently active deck after reconnect instead of blindly replaying the initial deck.

## Key files
- `packages/cli/src/core/schemas.ts`: Adds `change-deck` button validation and rejects missing target deck ids.
- `packages/cli/src/deck/controller.ts`: Owns active deck selection and back-stack navigation.
- `packages/cli/src/deck/runtime.ts`: Builds the active deck surface, injects the generated back button, and routes navigation taps.
- `packages/cli/src/cli/commands/start.ts`: Boots the runtime with the full deck map and restores the active deck after reconnect.

## Decisions made
- Navigation state lives in a dedicated controller instead of being folded into the device lifecycle or startup command.
- The reconnect path now prefers re-rendering the active deck surface over replaying stale buffers when the runtime is available.

## Deviations
- The approved implementation uses the last physical key for the generated back button, not key `0` as written in `03-03-PLAN.md`. This was changed based on explicit user confirmation during execution.

## Notes for downstream
- `03-03-PLAN.md` should be updated or at least read with the recorded deviation in mind because its back-button position is now stale.
- Phase verification and manual UAT should confirm real hardware behavior for main deck -> sub-deck -> back with the generated back button on the last key.
