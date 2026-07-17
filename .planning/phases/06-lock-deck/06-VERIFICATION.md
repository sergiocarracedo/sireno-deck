# Phase 6 Verification: Lock Deck

**Status:** passed
**Date:** 2026-07-17

## REQ Coverage

| Req ID | Description | Met? | Evidence |
|--------|-------------|------|----------|
| REQ-011 | `lock:` config block defines custom lock deck | ✅ | `LockSchema` in `config/schemas.ts`; `lockConfig` plumbed through `createDeckRuntime` → `createRuntime`; `buildUserLockDeck` synthesizes from user spec |
| REQ-012 | Session locked → lock deck overrides active deck | ✅ | `getActiveDeckId()` short-circuits to `"lock:deck"` when `lockActive`; runtime test asserts |
| REQ-013 | Locked mode: gestures disabled, system buttons not injected | ✅ | `computeSystemButtonForSlotN1` returns `null` when `lockActive`; `invokeAction` pre-check drops non-folder actions; 5 tests in `lock-deck.test.ts` |
| REQ-014 | Default deck: 3 time buttons HH : MM | ✅ | `buildDefaultLockDeck` returns 3 buttons (`hour`, `separator`, `minute` slots); test asserts slot set |
| REQ-015 | User-configured folder navigation exits locked mode | ✅ | `LOCK_FOLDER_NAV_TYPES` whitelist (`core:change-deck`, `core:page-nav`) → escape path clears `lockActive`; 3 tests assert |
| REQ-016 | Buttons on user-defined lock deck have actions disabled | ✅ | `invokeAction` pre-check returns early for non-folder buttons; test "suppresses non-folder actions on lock deck" |

## Must-Haves (from plans)

### Plan 06-01
- ✅ `lock: z.object({ buttons: ButtonDefSchema.array().optional() }).strict().optional()` accepted at root
- ✅ `session.locked_deck` removed
- ✅ Closure-local `lockActive`, `preLockActiveDeckId`, `preLockOverlayDeckId`, `sessionUnsubscribe`
- ✅ `getActiveDeckId()` returns `'lock:deck'` when `lockActive` — overrides regular + overlay
- ✅ `buildDefaultLockDeck()` synthesizes 3 buttons with `date-time:locked-time-tile` slots hour/separator/minute
- ✅ `Runtime.setSessionProvider` + `Runtime.isLockActive` exposed
- ✅ Session provider wired into runtime in `run.ts:startSystemProviders`
- ✅ Broken `session:locked` addon removed
- ✅ No protocol message changes (backend-only per CONTEXT)
- ✅ `pnpm test` clean (12 pre-existing failures unchanged)

### Plan 06-02
- ✅ `lock.buttons` accepts full `ButtonDefSchema`
- ✅ `buildUserLockDeck(buttons)` returns synthesized deck
- ✅ `getActiveDeck()` branches: user-deck → default 3-button
- ✅ Lock-mode pre-check at top of `invokeAction`
- ✅ Folder-nav detection via button-type whitelist
- ✅ `findButton` resolves synthesized lock deck buttons
- ✅ Idempotent unlock handler (locked-unlocked no-op after escape)
- ✅ `runtime:lock-mode` pubsub event on session-locked/unlocked/escape
- ✅ 10 tests in `lock-deck.test.ts` cover all paths

### Plan 06-03
- ✅ `latestActiveAppSnapshot` retained in closure
- ✅ Snapshot captures regular-layer deck (uses `overlayPreviousActiveId`)
- ✅ On unlock: if trigger matches → `setOverlay(..., { source: "autoShow" })`; else dismiss + navigateToDeck
- ✅ Escape is sticky (no auto-restore after folder-escape)
- ✅ Snapshot refresh on consecutive `locked` events
- ✅ 5 tests in `overlay-lock-resume.test.ts` cover all paths

## Integration Links

- `cli/commands/run.ts:484-491` — threads `config.lock?.buttons` into `createDeckRuntime` (locked → run startup config wiring)
- `cli/commands/run.ts:609-611` — `runtime.setSessionProvider(session)` (consumes the previously-dangling session provider)
- `deck/runtime.ts:setSessionProvider` — subscribes + toggles `lockActive` on state transitions
- `deck/runtime.ts:getActiveDeck` — branches on `lockActive` (lock deck) vs normal (real active)
- `deck/runtime.ts:invokeAction` — pre-check for folder-nav escape
- `deck/system-back-injection.ts:computeSystemButtonForSlotN1` — returns null when `state.lockActive`
- `deck/runtime.ts:applyOverlay` — preserved Phase 5 overlay logic; lock overlay snapshot read by restore path
- `addon-handler-bridge.ts:registerButtonHandler` — `core:change-deck`/`core:page-nav` already wired to publish `runtime:navigate-deck`
- `cli/commands/run.ts:254-271` — `runtime:navigate-deck` subscriber calls `runtime.navigateToDeck`

## Test Counts

- New tests: 15 (10 in `lock-deck.test.ts`, 5 in `overlay-lock-resume.test.ts`)
- Total deck module tests: 84 → 99 across all deck test files
- Workspace: 12 failures (all pre-existing — verified on trunk)

## Score: 6/6 requirements met, 22/22 must-haves met.

PASS.