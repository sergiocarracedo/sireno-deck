---
quick_task: 001
title: Fix gesture state machine (buffer accumulation + premature tap emit)
status: ready
---

# Plan

## Task 1: Fix `nextGesture` to not emit tap prematurely

- File: `packages/cli/src/core/gesture-state.ts`
- Change the cleanup at the end of `nextGesture`: instead of emitting `tap` when
  the loop ends in `await-second` state, return `null` so the caller can
  decide whether to commit the tap after waiting for a second tap.
- Add an export `pendingTapFromState(state, keyIndex): GestureResult | null` that
  builds the `tap` result from an `await-second` state when the caller is
  ready to commit.
- Update existing tests in `packages/cli/src/core/gesture-state.test.ts` to
  match the new contract (no auto-emit of tap; cleanup returns null unless
  state is `down`/`second-down`).
- Acceptance: `nextGesture([down, up])` returns `null` (caller must commit
  manually); `nextGesture([down, up, down])` returns `null`; `nextGesture([down,
up, down, up])` returns `dbl-tap`.

## Task 2: Fix `dispatchMouseEvent` to use the new contract

- File: `packages/cli/emulator/src/gesture.ts`
- Change the buffer update: when `nextGesture` returns a non-null result, slice
  the buffer to `buffer.slice(result.timestamps.length)` so consumed events are
  dropped.
- When `nextGesture` returns `null` and the resulting state is
  `await-second`, schedule a `setTimeout(commit, DOUBLE_TAP_DELAY_MS)` to emit
  the tap from the pending state. Cancel the timer if a new event arrives
  before it fires (replay with the new event).
- Track the pending timer per `bufferRef` (use a ref alongside the buffer).
- Acceptance: a single click emits exactly one `tap`. Two clicks within 200 ms
  emit one `dbl-tap` (no `tap` first). A long press (> 600 ms) emits `hold`.
- Note: this lives in the emulator-shell, not the runtime — the runtime only
  receives the final gesture result.

## Task 3: Verify end-to-end

- Run `pnpm test` to ensure existing gesture + emulator tests still pass.
- Boot `pnpm dev start --emulator` and verify (via CLI logs) that single
  clicks emit `tap`, double clicks emit `dbl-tap`, and long presses emit
  `hold`.
- Update gesture tests if needed.

## Must-Haves

- A single click on the emulator-shell produces exactly one `tap` WS message.
- A double-click within 200 ms produces one `dbl-tap`, not `tap` + `dbl-tap`.
- A long press (> 600 ms) produces `hold`.
- `pnpm test` still passes (no regressions).

## Verification

- `pnpm --filter sireno-deck typecheck` clean
- `pnpm --filter sireno-deck lint` clean
- `pnpm test` all passing
