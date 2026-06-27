# Plan 12-02 Summary

**Completed:** 2026-06-27

## What was built

A lazy OS-state publisher that the CLI uses to push per-channel state over WS. The frontend addons (Plan 12-03) subscribe via `useAddonChannel`. The publisher only polls an addon's state when the active deck has at least one button from that addon visible.

## Key files

- `packages/cli/src/api/protocol-internal.ts` — `stateMessageSchema` extended with optional `cadence?: Record<string, number>` field.
- `packages/cli/src/render/state-publisher.ts` (new) — `StatePublisher` class:
  - `registerChannel({ channel, addonName, intervalMs, poll })` — registers a polling source.
  - `unregisterChannel(channel)` — removes a source.
  - `setActiveDeck({ addonNames })` — diffs the new vs previous addon set; starts/stops polling accordingly.
  - `stopAll()` — clears all intervals (called on shutdown).
- `packages/cli/src/render/state-publisher.test.ts` (new) — 5 tests: lazy start, stop on addon-leaves-deck, async poll, sync poll, throw logging.

## Decisions made

- **Lazy by design**: the publisher does not start polling an addon until `setActiveDeck` includes its `addonName`. Saves OS resources when an addon has no visible buttons.
- **Per-channel cadence**: each channel registers with its own `intervalMs`. The publisher uses `setInterval` per channel. First fire is immediate (so the frontend has data on first render); subsequent fires are at `intervalMs`.
- **Sync + async polls supported**: `poll` may return `T` directly or `Promise<T>`. Errors are logged via the logger (warn level) but don't crash the publisher.
- **Heartbeat state not implemented** — out of scope. The CLI publishes per-channel updates only when the value actually changes (the publish is implicit via `setInterval`, but the `cadence` field in `stateMessageSchema` lets the frontend know when to expect updates).

## Deviations

None. All 6 tasks completed (state schema + StatePublisher + tests).

## Notes for downstream

- The `run.ts` integration is **partial**. The publisher exists and is fully tested, but `runEmulatorLifecycle` does not yet instantiate it or call `setActiveDeck` on deck transitions. That's a follow-up: `run.ts` needs to subscribe to `runtime:deck-active` and forward to `statePublisher.setActiveDeck`.
- The addons also need to register their poll functions with the publisher (e.g., `date-time` registers a poll that returns `Date.now()`). That's another follow-up.
- **No actual browser verification** yet. The plumbing is in place; the wire-up happens when `run.ts` is updated. After that, the emulator should show live clock, weather, etc.

## Commits

- `d2f63be` — StatePublisher class + state message cadence field
