# Quick Task 038: Lock deck should not show home or back button

## Tasks

### Task 1: Fix synthetic config in getDeckButtons to include implicit locked deck
- **files:** `packages/cli/src/deck/runtime.ts`
- **action:** In `getDeckButtons()`, change the synthetic config construction to always set `session.locked_deck` — using `options.lockedDeckId` if set, otherwise falling back to `IMPLICIT_LOCKED_DECK_ID`. Currently the implicit locked deck case is missed because `options.lockedDeckId` is `undefined` and the synthetic config is left empty.
- **verify:** `shouldInjectSystemBack()` with the synthetic config correctly returns `false` for the implicit locked deck
- **done:** Implicit locked deck (`__sireno_locked_session__`) no longer gets a system-back button

### Task 2: Add test for implicit locked deck system-back suppression
- **files:** `packages/cli/src/deck/runtime.test.ts`
- **action:** Add a test `"does not inject a system-back button on the implicit locked deck"` that creates a runtime without `lockedDeckId`, enters lock mode via the session monitor, and asserts `getButton(14)` is `undefined`.
- **verify:** New test passes
- **done:** Test verifies implicit locked deck has no back/home button
