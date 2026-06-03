# Plan 35-02 Summary

## What Built

- Added error logging in `renderHardwareFrame` handler so live-frame delivery failures are reported instead of silently swallowed.
- Added browser-renderer regression: `stops steady-state captures after close() in live hardware mode` proves shutdown halts the loop.
- Added start-daemon regressions:
  - `delivers live frames to the current connection after device reconnects` proves the frame handler resolves the connection dynamically and later frames reach a new connection after lifecycle reconnect.
  - `keeps delivering live frames after runtime replacement` proves live frames survive `applyReloadedRuntime` and continue writing through the existing handler.

## Verification

- `pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts src/render/browser-renderer.test.ts -t "placeholder|capture failed|close|shutdown"` — 4 passed
- `pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts -t "reconnect|reload|runtime|rendered browser-backed"` — 9 passed (1 pre-existing `variant` failure)

## Commits

- `ef26c2c` `feat(35-02): harden live hardware resampling across placeholder, reconnect, and reload edges`

## Notes

- `renderHardwareFrame` uses `activeLifecycle.getConnection()` dynamically, so reconnects and runtime replacements naturally pick up the new device handle without extra rewiring.
- Per-key deduped writes through `writeKeyBuffer(...)` remain the sole hardware transport — no panel abstraction was added.
