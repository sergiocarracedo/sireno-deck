# Plan 06-01 Summary

**Completed:** 2026-07-17

## What was built

Default time lock deck activates on OS lock. When `SessionProvider` reports `locked`, the runtime enters a global lock mode that synthesizes a 3-button HH:MM deck (`date-time:locked-time-tile` slots hour / separator / minute) as the active deck, suppresses all n-1 system buttons, and on `unlocked` restores the pre-lock active deck. The previously-dangling `session` provider in `run.ts` is now wired into the runtime via `runtime.setSessionProvider(session)`. The orphaned `session:locked` addon factory (with its broken `NullButton` `session:time` frontend) is removed — the runtime now builds the default lock deck.

## Key files

- `packages/cli/src/config/schemas.ts` — added `LockSchema`, added `lock:` to `RawConfigSchema`, removed orphan `SessionSchema`.
- `packages/cli/src/config/__tests__/validation.test.ts` — fixture dropped `session: { locked_deck: ... }`.
- `packages/cli/src/deck/runtime.ts` — closure-local `lockActive`/`preLockActiveDeckId`/`preLockOverlayDeckId`/`sessionUnsubscribe`; `Runtime.setSessionProvider` + `isLockActive`; `getActiveDeckId` short-circuits to `"lock:deck"` when locked; `buildDefaultLockDeck()` synthesizes 3 buttons.
- `packages/cli/src/deck/system-back-injection.ts` — `computeSystemButtonForSlotN1` returns `null` when `state.lockActive`; `injectSystemButtons` accepts `{ lockActive?: boolean }`.
- `packages/cli/src/cli/commands/run.ts` — calls `runtime.setSessionProvider(session)` after `setActiveAppProvider`.
- `packages/cli/src/builtin-addons/session/` — removed `decks/locked.ts`, removed `session:time` button + `decks` block from `index.ts`, dropped the 5-button test, README rewritten.
- `packages/cli/src/cli/commands/__tests__/{run,start}.test.ts` — fake runtime mock extended with `setSessionProvider`.

## Decisions made

- Default lock deck is **synthesized inside `getActiveDeck()`** when `lockActive` — never registered into the closure-local `decks` array. Ephemeral by design.
- `setSessionProvider` mirrors `setActiveAppProvider` shape: subscribes once, replaces prior subscription, stores unsubscribe in closure for shutdown.
- Removed `session.locked_deck` schema field rather than leaving it as a deprecated alias — schema is `.strict()`, no backward-compat requirement, and a misleading alias would confuse future readers.
- `restoreFromLockSnapshot` (Plan 3) is left as a TODO-shaped helper inside the unlock handler — Plan 1 wires the snapshot mechanism but Plan 3 completes the overlay-resume logic.

## Notes for downstream

- Plan 02 (06-02) extends `getActiveDeck()` to consult `lockConfig.buttons` (user-defined) before falling back to `buildDefaultLockDeck()`. The plan-1 placeholder branch in `getActiveDeck()` exists; Plan 02 fills it in.
- Plan 02 also adds the gesture-router pre-check in `invokeAction` — the current `invokeAction` runs the dispatch path unconditionally.
- The `runtime:lock-mode` pubsub event (Plan 02 T2.5) is not yet published — Plan 02 adds it.
- `validation.test.ts` fixture no longer has a `session:` field; if any future test fixture needs an example with `lock.buttons`, use the shape `{ buttons: [{ type: 'core:action', position: 0 }] }` per the schema.
- 12 pre-existing test failures remain (emoji-selector, weather, integration, ws-integration, config — verified on trunk before any Phase 6 commits). Not introduced by this plan.

## Commits

- `8bdd594d` T1.1 — schema + remove orphan
- `4ca6b022` T1.2 — runtime lock-state + session subscription
- `6adfb82d` T1.3 — default 3-button deck synthesis
- `5ddf20d7` T1.4 — system-button suppression
- `1f283a19` T1.5 — wire session provider into run.ts
- `b3e5a08` T1.6 — remove broken addon factory + mock fixes