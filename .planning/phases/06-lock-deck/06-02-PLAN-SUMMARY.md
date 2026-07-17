# Plan 06-02 Summary

**Completed:** 2026-07-17

## What was built

User-defined lock deck + gesture suppression with folder-nav escape. When `lock.buttons` is configured, the runtime synthesizes a user-defined `lock:deck` from the user's button spec (full `ButtonSpec` shape: type, position, config, actions, accent, background, full). While `lockActive`, every gesture dispatch is suppressed at the gesture router EXCEPT folder-navigation buttons (`core:change-deck`, `core:page-nav`) — the escape hatch clears `lockActive` and lets the normal dispatch path navigate.

The pre-check is a button-type whitelist (not a string-prefix convention), since `core:change-deck.onTap` and `core:page-nav.onTap/onHold` already publish `runtime:navigate-deck` to the pubsub, and `run.ts` subscribes to that event to call `runtime.navigateToDeck`. No new dispatch prefix needed.

## Key files

- `packages/cli/src/deck/runtime.ts` — added `LockDeckConfig` + `LockDeckButtonSpec` to `CreateRuntimeOptions`; `buildUserLockDeck(buttons)` returns a deck from user spec; `getActiveDeck()` branches on `lockConfig.buttons.length > 0`; `LOCK_FOLDER_NAV_TYPES` constant for the escape whitelist; pre-check at top of `invokeAction`; `findButton` now resolves buttons on the synthesized `lock:deck`; active-deck check in `invokeAction` accepts `lock:deck` after escape.
- `packages/cli/src/deck/index.ts` — `CreateDeckRuntimeOptions` extended with `lockConfig?: LockDeckConfig`; re-exports `LockDeckConfig` + `LockDeckButtonSpec`.
- `packages/cli/src/cli/commands/run.ts` — threads `config.lock?.buttons` into `createDeckRuntime({ lockConfig })`.
- `packages/cli/src/deck/__tests__/lock-deck.test.ts` — new test file (10 tests covering user-deck render, default fallback, gesture suppression, escape, idempotent unlock, pubsub events).

## Decisions made

- **Escape detection via button-type whitelist** (`core:change-deck`, `core:page-nav`) rather than a new `navigate://` dispatch prefix. Rationale: the existing pubsub path `runtime:navigate-deck` is already wired end-to-end (button backend → pubsub → `run.ts` subscriber → `runtime.navigateToDeck`). Adding a new prefix would duplicate the wiring and require a new `dispatch()` branch.
- **Idempotent unlock handler**: Plan 1's `setSessionProvider` already guards `unlocked` behind `lockActive === true`, so an OS unlock event after a folder-escape (where `lockActive` is already `false`) is a no-op. No additional code needed.
- **Snapshot refresh on re-lock** (T2.4-adjacent): the session-subscribe handler now refreshes `preLockActiveDeckId` / `preLockOverlayDeckId` on a second `locked` event while already locked. Handles screen-saver pulse + actual lock interleavings.
- **Active-deck check exception** (`found.deckId !== getActiveDeckId() && found.deckId !== "lock:deck"`): after escape, `getActiveDeckId()` immediately returns the original main deck (because `lockActive=false`), but the button's deck id is still `"lock:deck"`. Without the exception, the post-escape gesture would be dropped as "inactive deck". The exception lets the dispatched handler fire on the freshly-navigated deck.

## Notes for downstream

- Plan 03 needs the `latestActiveAppSnapshot` closure-local to wire `restoreFromLockSnapshot`. The active-app poll loop in `runtime.ts` should store the latest snapshot (currently not retained — only used for overlay matching).
- The pubsub event `runtime:lock-mode` is now published on: session-locked, session-unlocked, escape. Subscribers can hook in for visual feedback (e.g. dimming the lock deck) without re-querying `runtime.isLockActive()`.
- The synthesized lock deck is NOT registered into the closure-local `decks` array. `findButton` synthesizes on demand when `lockActive`. `run.ts` does NOT publish it via `deck-config` — the frontend would need its own mechanism to render it (deferred to a future frontend phase per CONTEXT.md).

## Commits

- `9e3f1fc` T2.1 — `buildUserLockDeck` + plumb `lockConfig` through runtime
- `6a4958b` T2.3 — lock-mode gesture router pre-check with folder-nav escape
- `19682fb` T2.5 — publish `runtime:lock-mode` event on every transition
- `4cc6a5b` T2.1-followup — wire synthesized lock deck into `findButton` + post-escape active-deck exception