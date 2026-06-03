# Plan 16-03 Summary

**Completed:** 2026-05-19

## What was built
Invalid live reloads no longer silently leave the previous deck surface in place or kill the daemon. Instead, the running runtime switches to a built-in temporary error deck rendered through the normal device/render path, showing a compact config error summary until a later valid reload rebuilds the runtime and restores the last valid user context automatically.

## Key files
- `packages/cli/src/cli/commands/start.ts`: converts reload-time `ConfigValidationError` failures into a runtime-owned temporary error deck instead of console-only handling.
- `packages/cli/src/deck/runtime.ts`: adds temporary error-deck overlay support without mutating the real navigation stack.
- `packages/cli/src/render/text-image.ts`: adds the shared render-path `error` variant for readable reload failures.
- `packages/cli/src/deck/runtime.test.ts`: proves invalid reload entry and preserved valid navigation state.
- `packages/cli/src/render/text-image.test.ts`: proves the error surface renders as a distinct readable failure card.

## Decisions made
- Implemented the error surface as a runtime overlay instead of a controller stack mutation so recovery still restores the user's last valid stack.
- Kept the fallback summary short and runtime-owned: location, error message, and suggestion only.

## Deviations
- None.

## Notes for downstream
- The temporary error deck is isolated from config-authored decks on purpose; using user config for fallback would be circular when the config itself is broken.
- The next valid reload path already exits this state automatically because runtime rebuild and restore are owned by the Phase 16 reload flow.
