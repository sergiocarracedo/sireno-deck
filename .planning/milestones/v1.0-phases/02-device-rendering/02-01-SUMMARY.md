# Plan 02-01 Summary

**Completed:** 2026-05-12

## What was built
Implemented the first hardware lifecycle slice for Phase 2. The CLI can now discover attached Stream Deck devices, enforce the serial-selection rules agreed in Phase 2 context, surface Linux udev permission guidance, and keep a reconnect loop alive for disconnect scenarios.

The daemon startup path now owns the device lifecycle and shutdown cleanup path, so Phase 2 has a usable hardware foundation for the render plans that follow.

## Key files
- `packages/cli/src/device/stream-deck.ts`: discovery, selection, connection, and reconnect lifecycle
- `packages/cli/src/device/linux-udev.ts`: Linux permission diagnostics and udev guidance formatting
- `packages/cli/src/device/stream-deck.test.ts`: selection and reconnect behavior coverage
- `packages/cli/src/device/linux-udev.test.ts`: Linux access diagnostic coverage
- `packages/cli/src/cli/commands/start.ts`: daemon startup integration for device lifecycle
- `packages/cli/src/util/daemon.ts`: async cleanup hook for hardware shutdown

## Decisions made
- Used the real `@elgato-stream-deck/node` API after inspecting the installed package instead of assuming plugin-SDK shapes.
- Treated device loss as the library's propagated `error` event because the public `StreamDeck` surface does not expose a dedicated `disconnect` event.
- Included common Linux rules-path hints plus the installed package asset path in udev guidance when available.

## Deviations
- Folded the remaining `packages/cli` rename restoration into the startup/shutdown task commit because the earlier package rename left required CLI/config/util files untracked. Leaving them untracked would have broken Phase 2 continuity even though the new lifecycle logic itself was complete.

## Notes for downstream
- `pnpm install` still warns that `node-hid` build scripts were skipped. Tests and typecheck pass, but real hardware validation may still need `pnpm.onlyBuiltDependencies` plus a rebuild before live verification.
- The reconnect hook is ready for Phase 2 render-state replay in `02-02`.
