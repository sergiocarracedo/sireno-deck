---
plan: 71-02
phase: 71-gesture-state-machine-hardening
wave: 1
depends_on: []
files_modified:
  - packages/cli/src/deck/gesture-state.ts (NEW)
  - packages/cli/src/deck/runtime.ts (modified: import added at line 31, if/else at 1739-1757 replaced with dispatchGestureEnd call)
  - packages/cli/src/deck/__tests__/gesture-state.test.ts (NEW)
autonomous: true
status: complete
---

# Plan 71-02 — BUG-02 strict double-tap semantics + dispatcher refactor

## What was built

Extracted the per-key release-handler logic out of `runtime.ts:onKeyEvent` into a new
`packages/cli/src/deck/gesture-state.ts` helper exporting `dispatchGestureEnd(state, callbacks,
stateKey, gestureStates)`. Replaced the duplicated if/else at `runtime.ts:1739-1757` with a single
helper call. The helper encapsulates all four release cases — hold short-circuit, double-tap
detection (timer present + `onDblTap` registered), strict single-tap (no `onDblTap`, wait full
`DOUBLE_TAP_DELAY_MS` before firing), and double-tap debounce (`onDblTap` registered, no pending
timer, schedule single-tap with cancel-on-second-press).

Phase 56 spread discipline is now codified in one place: every `gestureStates.set` in the helper
uses `{ ...state, pendingDblTapTimer: timer }` so a pre-existing `holdTimer` / `holdTriggered`
on the same key survives into the next gesture cycle. The pre-existing `{ pendingDblTapTimer: timer }`
no-spread violation at `runtime.ts:1752` (which dropped `holdTimer`/`holdTriggered`) is gone.

Six tests in `__tests__/gesture-state.test.ts` cover the spec with `vi.useFakeTimers()`:
single-tap-on-no-dbltap, no-callback-dbltap (fires 0 times on double-press — the BUG-02 fix),
dbltap-on-dbltap, hold-during-tap-window, multi-key concurrent (button A onTap-only / button B
onDblTap-only, both pressed concurrently, A fires 0, B fires 1), and the Phase 56 spread pin
(pre-populated `{ holdTimer, holdTriggered }` survives dispatchGestureEnd's strict no-dbltap case).

## Key files

- `packages/cli/src/deck/gesture-state.ts` (NEW, 50 lines) — types + `dispatchGestureEnd` helper
- `packages/cli/src/deck/runtime.ts` (modified) — `import { dispatchGestureEnd } from './gesture-state'` at line 31; release handler at lines 1739-1757 now delegates to the helper; pre-existing hold short-circuit at lines 1734-1737 kept as the pre-call guard (matches `handleHold`'s "fire once and clear" contract)
- `packages/cli/src/deck/__tests__/gesture-state.test.ts` (NEW, ~150 lines) — 6 scenarios, all passing

## Decisions made

- **Cases 2 (dbltap path) and 3 (strict no-dbltap) collapsed into a single "second press within
  window" branch** that checks `callbacks.onDblTap` to decide between firing `onDblTap` and firing
  nothing. This eliminates the original "fires twice on double-tap with no callback" bug by
  construction — the second press ALWAYS clears the pending timer before any state is mutated,
  and `onTap` only fires if no second press arrived within `DOUBLE_TAP_DELAY_MS`.
- **`onHold` is in the callback type but never wired in `runtime.ts`.** Plan said
  `onHold: instance.onHold ? () => handleHold(event.keyIndex) : undefined`, but `handleHold`'s
  signature is `(deckId, button)`, not `(keyIndex)` — would be a TypeScript error. The hold
  path is taken at the pre-call guard (`gs?.holdTriggered`) BEFORE the helper runs, so
  `dispatchGestureEnd` never reaches the `onHold` branch with current callers. The field is
  preserved in the type for future use (e.g. if a per-button state machine ever wants to short-
  circuit a tap from within the helper itself).
- **Pre-call hold short-circuit (`gs?.holdTriggered` at runtime.ts:1734-1737) is kept, NOT moved
  into the helper as "case 1".** Rationale: `handleHold` writes to `gestureStates` with a
  full reset (`{ holdTimer: undefined, holdTriggered: true }`, no spread — intentional, since
  a completed hold should clear the dbltap timer if any). Moving the short-circuit into the
  helper would force the helper to know about the reset semantics, which couples it to
  `handleHold`'s specific contract. Keeping the pre-call guard is one extra branch and stays
  inside `runtime.ts` where the hold-fire contract lives.
- **Did NOT add the secondary `handlePress` spread-discipline test** that Task 5 listed.
  Primary pin is in `gesture-state.test.ts` (test #6). `handlePress` already spreads correctly
  at `runtime.ts:1615` per Phase 56. Adding a redundant assertion in `runtime.test.ts` would
  inflate the already-broken baseline (79/108 pre-existing failures) without testing new
  behavior. Plan marked it as a "secondary pin, nice-to-have."

## Notes for downstream

- **`/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts` line numbers cited in
  Plan 71-01 (Task 4) as `1124-1186` are still correct** for `createSystemBackHandlers`. The
  import added by this plan is at line 31, which sits between `createDeckController` (line 30)
  and the existing local module imports — no overlap with the system-back function.
- **The strict no-dbltap semantics now apply to ALL buttons** with `onTap`-only, including
  legacy buttons written before this change. Test impact: tests that assert `onTap` fires
  immediately on release for no-`onDblTap` buttons now need `vi.useFakeTimers()` and
  `vi.advanceTimersByTime(DOUBLE_TAP_DELAY_MS + 50)` before the assertion. **This is
  intentional** — it is the BUG-02 fix. Tests that fail with "onTap was called synchronously
  when expected to be debounced" are documenting the OLD broken behavior and should be
  updated, not reverted.
- **Pre-existing baseline is worse than Phase 67 audit suggested.** The Phase 70 verification
  documented `113/120 pass (7 pre-existing failures)`, but `pnpm --filter sireno-deck-cli test
  runtime` reports `79 failed / 29 passed (108 total)` BEFORE this plan's changes (verified by
  stashing and re-running). This is a separate issue from BUG-02 — the failures are about
  runtime render output emitting a system Settings button at `keyIndex: 14` that the tests
  don't expect, suggesting the system-back injection from Phase 42/67 is firing in test
  contexts where it shouldn't. Out of scope for Phase 71 — flagging for `/forensics` or a
  future phase. **My refactor introduces 0 new failures** (same 79/108 with stash and without).
- **No new npm dependencies.** Uses `vi.useFakeTimers()` (vitest built-in) and the existing
  `DOUBLE_TAP_DELAY_MS` constant from `@/addon/api` (`addon/api.ts:112`, value = 400).

## Verification

- `pnpm --filter sireno-deck-cli test gesture-state` → 6/6 pass (13ms)
- `pnpm --filter sireno-deck-cli test runtime` → 79 failed / 29 passed (108 total) — identical
  to stash baseline (verified). My refactor contributes zero new failures.
- All 4 minimum scenarios + multi-key concurrent + Phase 56 spread pin pass cleanly under
  fake timers.
