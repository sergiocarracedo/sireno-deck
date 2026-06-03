# Plan 22-03 Summary

**Completed:** 2026-05-25

## What was built
Finished the emulator control surface with explicit supported virtual devices, restart-on-change behavior, and browser-visible mismatch failures. The local page now offers a virtual device selector backed by the renderer’s known key-count layouts, restarts the virtual runtime cleanly on selection changes, and shows an `Emulator Layout Error` state when the chosen device is too small for the configured deck.

## Key files
- `packages/cli/src/render/browser-renderer.ts`: added the shared supported virtual-device list used by the selector.
- `packages/cli/src/cli/commands/start.ts`: added managed-session restart flow, device switching endpoint, and honest emulator error state handling.
- `packages/cli/src/cli/commands/start.test.ts`: locked restart-on-change and mismatch-failure behavior.
- `packages/cli/fixtures/phase-22/README.md`: extended the review path with switching and mismatch checks.

## Decisions made
- Used the renderer’s key-count/layout table as the source of truth for emulator device options to avoid drift.
- Restarted the emulator session on device change instead of mutating the active runtime in place, which keeps deck shape changes explicit and predictable.

## Deviations
- None.

## Notes for downstream
- Renderer instances are now key-count specific and must be recreated when the emulated device changes.
