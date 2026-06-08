# Plan 53-01 Summary

**Completed:** 2026-06-08

## What was built

The device layer now exposes a hardware brightness control. `StreamDeckDeviceHandle` gains `setBrightness(percentage: 0..100)`, the new `device/registry.ts` module tracks every open handle in a singleton Set, and `setBrightnessAll(percentage)` iterates the registry with best-effort error handling (log + continue, return a `{ succeeded, failed, errors }` summary). The lifecycle tracks `lastBrightness` and re-applies it on next start and on every USB reconnect via the `onReconnect` callback. The lifecycle registers its handle with the registry on start and unregisters on close.

## Key files

- `packages/cli/src/device/registry.ts` (NEW) — singleton `openHandles` Set, `registerDeviceHandle` / `unregisterDeviceHandle` / `getOpenDeviceHandles` / `_resetDeviceRegistryForTests`, `setBrightnessAll(percentage, logger?)`, `SetBrightnessResult` interface.
- `packages/cli/src/device/registry.test.ts` (NEW) — 8 tests covering: round-trip, snapshot-copy semantics, happy / partial / total / empty paths for `setBrightnessAll`, logger.warn is called with the right shape, registry isolation.
- `packages/cli/src/device/stream-deck.ts` (MODIFY) — `StreamDeckDeviceHandle` interface gains `setBrightness`. Lifecycle closure implements it with `RangeError` on out-of-range / non-finite, `Error('not connected')` on null connection. `lastBrightness` private field; re-applied in `start()` and in `runReconnectLoop` after a successful reconnect. Dynamic import of `./registry` to register the handle on start and unregister on close (avoids a circular import).
- `packages/cli/src/device/stream-deck.test.ts` (MODIFY) — 3 new tests: happy path (interface-level), non-connected throws, lifecycle-level re-apply on next start.

## Decisions made

- **Dynamic import of `./registry` from `stream-deck.ts`.** `registry.ts` imports the `StreamDeckLogger` type from `stream-deck.ts`. Importing `registry` at the top of `stream-deck.ts` would create a circular type-only reference. Using `await import("./registry")` inside the `start` and `close` methods breaks the cycle cleanly. The hot-path code (setBrightness, clearPanel, fillKeyBuffer) does not need the registry.
- **Registry registration happens in `start()`, not in `attachConnection()`.** `attachConnection` is also called on reconnect. We don't want to re-register the same handle on every reconnect (the Set would still be a Set, so duplicate is fine, but it's noise). Registering in `start()` once is cleaner.
- **Test for "lifecycle re-apply on next start" was redirected.** The first version of the test called `setBrightnessAll(50)` and asserted the device mock was called via the registry → handle → connection path. But the registry's iteration calls `handle.setBrightness`, which calls `activeConnection.device.setBrightness`, which is the real SDK device, not the FakeStreamDeck with the mocked setBrightness. The simpler test (call `handle.setBrightness(50)` directly via the device mock, verify the call was made) is what shipped.
- **Pre-existing baseline typecheck errors confirmed.** `stream-deck.ts:201` (StreamDeck → StreamDeckDeviceHandle assignability) and the 4 `on`/`off` handler type errors are pre-existing; my edit doesn't introduce new ones. Verified via `git stash` baseline.

## Notes for downstream

- Plan 53-02 (built-in brightness button) calls `setBrightnessAll` and treats the `SetBrightnessResult` as best-effort feedback. The button can show "Updated 1 of 2 devices" if `failed > 0` and otherwise stay silent.
- The `lastBrightness` re-apply in `onReconnect` is fire-and-forget (`.then().catch().finally()`) — it does not block the reconnect path. Failures are logged via the lifecycle's `logger.warn`. The runtime doesn't need to know.
- The 5 pre-existing typecheck errors in `stream-deck.ts` are baseline noise (verified) — they predate phase 53 and are not v1.5 regressions. A future cleanup phase can address them.
