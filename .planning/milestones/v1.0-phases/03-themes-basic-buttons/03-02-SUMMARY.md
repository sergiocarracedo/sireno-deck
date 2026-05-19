# Plan 03-02 Summary

**Completed:** 2026-05-12

## What was built
Phase 3 now has its first real interaction loop. Action buttons can execute shell commands on tap through a dedicated command boundary, the device lifecycle exposes key down/up subscriptions, and the deck runtime translates same-key tap gestures into built-in action behavior while ignoring display-only buttons. The runtime also owns per-button polling for `display_command` labels plus transient `...`, `OK`, and `ERR` feedback on the tapped key.

## Key files
- `packages/cli/src/action/executor.ts`: Runs shell commands through `execa`, captures stdout/stderr, and classifies failures/timeouts.
- `packages/cli/src/core/schemas.ts`: Adds the minimal `action` button config shape with `command`, optional `display_command`, and `interval_ms`.
- `packages/cli/src/device/stream-deck.ts`: Publishes key `down`/`up` events from the real Stream Deck lifecycle.
- `packages/cli/src/deck/runtime.ts`: Owns tap detection, action dispatch, transient feedback, and per-button polling updates.
- `packages/cli/src/cli/commands/start.ts`: Boots the runtime and routes render callbacks through the existing image write pipeline.

## Decisions made
- Used `/bin/sh -c` via `execa` as the trusted command execution boundary for action buttons.
- Kept action feedback intentionally narrow and on-device only: busy `...`, then `OK`/`ERR`, then automatic restoration.
- Reused the existing polling scheduler per button instead of reviving the old full-deck Phase 2 demo scheduler.

## Deviations
- `packages/cli/src/render/reconciler.ts` needed a small type widening in the first Wave 2 task because the existing helper had been narrowed to display-only buttons during Wave 1.

## Notes for downstream
- The runtime currently assumes a single active deck and no navigation state; Wave 3 should layer deck control on top of it rather than bypassing it.
- Planning docs still disagree with earlier discussion on back-button placement (`key 0` vs last physical key); that conflict should be resolved explicitly before implementing navigation.
