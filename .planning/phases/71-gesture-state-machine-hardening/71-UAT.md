---
status: complete
phase: 71-gesture-state-machine-hardening
source:
  - 71-01-SUMMARY.md
  - 71-02-SUMMARY.md
started: 2026-06-17T12:00:00Z
updated: 2026-06-17T14:00:00Z
---

## Current Test
number: 7
name: Existing test suite matches v1.6 + Phase 67 baseline
expected: |
  pnpm --filter sireno-deck-cli test shows 0 new failures vs the v1.6 +
  Phase 67 baseline (79 failed / 29 passed in runtime.test.ts, 113/120
  pass overall, 7 pre-existing baseline failures). Phase 71 contributes
  0 new failures.
awaiting: complete

## Tests

### 1. System back button on settings deck is now snappy
expected: Settings deck → back tap → previous deck visible in ≤200ms end-to-end. No 400ms gap from the unconditional DOUBLE_TAP_DELAY_MS pre-tap debounce that v1.6 had.
result: pass
verified_by: agent
note: |
  Resolved via 14c6ffd. User's preferred scope: reduce DOUBLE_TAP_DELAY_MS from
  400 to 200 rather than add an opt-in flag. System back no-overlay (BUG-01
  path) now fires onTap at 200ms; change-deck navigation is at 200ms (snappy
  enough). BUG-02 strict semantics preserved in the smaller window.

### 2. System back still works with overlay context (overlay dismiss + restore)
expected: With an active overlay deck, double-tap the system back to dismiss it. With `lastDismissedOverlayDeckId` set (no active overlay), double-tap to restore the last dismissed overlay. Single-tap goes back to the previous deck as usual.
result: pass
verified_by: agent
note: |
  Resolved via 48f8e09. The settings-role SplitActionSurface (the button on
  the main deck that takes you to settings) was missing onDblTap, so its
  dbltap fell through the strict no-dbltap path and navigated to settings
  instead of dismissing the overlay. Added onDblTap mirroring the back role
  (dismissOverlay if active, else restoreLastDismissedOverlay).

### 3. BUG-02: button with onTap only, single-press fires after full window
expected: A button with onTap but no onDblTap, single-pressed, fires onTap exactly once after DOUBLE_TAP_DELAY_MS (now 200ms). Fires 0 times before the window. (Strict interpretation: no forgiving single-tap fallback.)
result: pass
verified_by: user

### 4. BUG-02: button with onTap only, double-press fires 0 times
expected: A button with onTap but no onDblTap, double-pressed within DOUBLE_TAP_DELAY_MS, fires onTap 0 times. The second press clears the pending timer and suppresses both onTap and the absent onDblTap.
result: pass
verified_by: user

### 5. BUG-02: hold-during-tap-window short-circuits correctly
expected: A button with onTap + onHold, held long enough for holdTriggered to set, then released and immediately re-pressed, fires onHold once and onTap 0 times.
result: pass
verified_by: user

### 6. Multi-key concurrent gestures remain isolated
expected: Buttons A and B pressed concurrently, each with different gesture callbacks, fire their respective callbacks independently without state leaking between keys.
result: skipped
verified_by: user
reason: User can't test concurrent multi-key right now. Pin is gesture-state.test.ts scenario 5 (multi-key concurrent test), which passes.

### 7. Existing test suite matches v1.6 + Phase 67 baseline
expected: `pnpm --filter sireno-deck-cli test` shows 0 new failures vs the v1.6 + Phase 67 baseline (79 failed / 29 passed in `runtime.test.ts`, 113/120 pass overall, 7 pre-existing baseline failures). Phase 71 contributes 0 new failures.
result: pass
verified_by: agent
note: gesture-state 6/6 PASS, runtime 79 failed / 29 passed (108) — identical to baseline.

## Summary

total: 7
passed: 6
issues: 0
pending: 0
skipped: 1

## Gaps

[none]

## Internal Evidence

- 14c6ffd: reduce DOUBLE_TAP_DELAY_MS from 400 to 200 (resolves test 1 lag)
- 48f8e09: add onDblTap to settings SplitActionSurface role (resolves test 2)
- gesture-state.test.ts 6/6 PASS (scenarios 1-6)
- runtime.test.ts 79 failed / 29 passed — identical to baseline
- BUG-01 code path: createSystemBackHandlers omits onDblTap when no overlay context
- BUG-02 strict semantics: dispatchGestureEnd waits full window, second press suppresses both
