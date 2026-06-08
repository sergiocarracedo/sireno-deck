---
status: passed
phase: 52
verified: 2026-06-08
gaps:
  requirements: []
  integration: []
  flows: []
  stubs: []
---

# Phase 52 Verification — Lock deck navigation refinement

## Requirements Coverage

| REQ-ID  | Description                                                                                                                | Plan(s) | Status         |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ------- | -------------- |
| LOCK-01 | Users can navigate to the lock deck from the main deck even when the session is not locked                                | 52-01   | ✓ satisfied (docs note: users add a change-deck button; navigation is already supported) |
| LOCK-02 | While the session state is `locked`, the core does not inject the system-reserved back button into the lock deck           | 52-01   | ✓ satisfied (gate: `config.session?.locked_deck === deck.id && sessionState === 'locked'`) |

**Total:** 2/2 requirements satisfied.

## Plan must_haves coverage

- ✓ `shouldInjectSystemBack` accepts a third argument `sessionState: HostSessionState` (from `@/system/host-context`)
- ✓ The lock-deck check is `config.session?.locked_deck === deck.id && sessionState === 'locked'` — both must hold
- ✓ `shouldInjectSystemBack(lockedDeck, config, 'unlocked')` returns `true` (the LOCK-02 unlocked case)
- ✓ `shouldInjectSystemBack(lockedDeck, config, 'locked')` returns `false` (the v1.4 behavior, preserved)
- ✓ `shouldInjectSystemBack(lockedDeck, config, 'unknown')` returns `true` (permissive for pre-warm)
- ✓ `shouldInjectSystemBack(nonLockDeck, config, 'locked')` returns `true` (other decks unaffected)
- ✓ Runtime call site in `getDeckButtons` (packages/cli/src/deck/runtime.ts:396) reads `hostContext.session.state` and passes it
- ✓ All 6 existing `system-back-injection.test.ts` tests updated to pass the new `sessionState` argument; continue to pass
- ✓ Runtime integration test asserts: unlocked session on lock deck → system-back button at reserved slot
- ✓ JSDoc comment in `schemas.ts` on `SessionSchema.locked_deck` notes the change-deck affordance and the v1.5 LOCK-02 behavior

## Files Inventory

### Created
- none

### Modified
- `packages/cli/src/deck/system-back-injection.ts` (function signature + 1-line gate change)
- `packages/cli/src/deck/system-back-injection.test.ts` (6 existing tests updated + 3 new LOCK-02 cases)
- `packages/cli/src/deck/runtime.ts` (1-line call site update at line 396)
- `packages/cli/src/deck/runtime.test.ts` (+1 new integration test)
- `packages/cli/src/core/schemas.ts` (JSDoc comment on SessionSchema.locked_deck)

## Key integration links verified

- `system-back-injection.ts` imports `HostSessionState` from `@/system/host-context` ✓
- `runtime.ts` reads `hostContext.session.state` at the call site (line 396) ✓
- The runtime's session-monitor mutates `hostContext.session.state` in place (line 358-359), so the value passed to `shouldInjectSystemBack` is always current ✓
- The synthetic config built in `getDeckButtons` (line 389-395) sets `session.locked_deck` from `options.lockedDeckId ?? IMPLICIT_LOCKED_DECK_ID` ✓
- `JSDoc` comment in `schemas.ts` is on the right field ✓

## Test totals (this phase)

- Plan 52-01: 13 new + 6 updated tests in 2 files
  - system-back-injection.test.ts: 6 existing + 3 new = 9 tests pass (10th is the SYSTEM_BACK_TYPE constant test)
  - runtime.test.ts: +1 new LOCK-02 integration test (6/51 pass; 45 pre-existing baseline failures unchanged)
- Pre-existing baseline failures: 45 in runtime.test.ts (verified via `git stash` + re-run + `git stash pop`)
- Pre-existing typecheck errors in runtime.test.ts: 5 (all predate this phase; my edit at line 396 introduces no new errors)

## UAT Recommendation

Visual confirmation recommended for:
- Navigating to the lock deck via a `change-deck` button on the main deck while the session is unlocked (the LOCK-02 unlocked case)
- The lock deck's reserved slot showing a back button (with the v1.4 chevron-left + "Back" treatment)
- Locking the session → the back button disappears from the lock deck
- Unlocking → the back button reappears (if the user is still on the lock deck)

## Verdict

**PASSED — all requirements satisfied, no critical gaps**

Phase 52 closes LOCK-01 (via a JSDoc note explaining the change-deck affordance) and LOCK-02 (via a one-line gate change that depends on both deck identity and session state). The v1.4 behavior is preserved. The pre-existing baseline failures in runtime.test.ts are unchanged and not in scope for v1.5.
