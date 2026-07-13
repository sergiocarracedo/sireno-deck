---
title: Gesture detection — use createGestureDetector for live streams; never nextGesture; both return value AND onGesture must fire for dbl-tap
date: 2026-07-09
category: logic-errors
module: packages/cli/src/core/gesture-state.ts + packages/cli/emulator/src/gesture.ts
problem_type: logic_error
severity: high
tags:
  [
    gesture-detection,
    per-transport-decoupling,
    create-gesture-detector,
    next-gesture,
    dbl-tap-callback,
    per-key-state,
    live-event-stream,
    200ms-window,
  ]
---

# Gesture detection — createGestureDetector vs nextGesture, and the dbl-tap callback gap

## Problem

Two independent bugs in the gesture detection pipeline shipped together. Both surfaced after the per-transport gesture-detector refactor moved detection out of the backend into each transport (emulator SPA + RealOutputClient). Either bug alone silently drops or misroutes gestures; together they make the emulator behave as if every click were on the first button that was pressed.

## Symptoms

- Click button A → fast release. Click button B (200ms+ later). Console logs `button-action {deckId, position: 0, gesture: "tap"}` — but the user just clicked button B. **Stale keyIndex leaks across keys.**
- Tap A. Wait 1 second. Tap A again. Console logs `dbl-tap {position: 0}` even though the second tap was well outside the 200ms dbl-tap window. **Stale dbl-tap fires from any second click, no matter how delayed.**
- Hold button A for 250ms. Console logs `hold` at 200ms. Release at 1000ms. Console logs a SECOND gesture for the same press — the release after a hold should be a no-op.

## Root cause 1 — `nextGesture` is the wrong tool for live event streams

The emulator SPA wired its detector through `nextGesture` — the synchronous, fold-style function in `core/gesture-state.ts:259` that runs the entire event list through the state machine once and returns a result if one materialized at the end of the buffer.

```ts
// packages/cli/emulator/src/gesture.ts (BUGGY — pre-fix)
export const dispatchMouseEvent = (buffer, newEvent) => {
  const result = nextGesture([...buffer.map(toCore), toCore(newEvent)])
  const newBuffer =
    result?.kind === "hold" || result?.kind === "dbl-tap"
      ? []
      : [...buffer, newEvent]
  return { buffer: newBuffer, result }
}
```

`nextGesture` does NOT implement the 200ms tap-detection window. The "tap" it returns at the end of `[down, up]` is the function-end fallback (line 332-338) — a synchronous inference, not a timer-driven observation. Worse, the buffer was shared across all keys: clicking A then B fed `nextGesture([A_down, A_up, B_down])`, which saw the stale `waiting-second` state for A and emitted a tap on A when B's down arrived (the cross-key early-return at `nextGesture` line 295-305).

`createGestureDetector` (line 110-257) is the correct tool for live streams. It carries per-key `KeyState` in a `Map<keyIndex, KeyState>`, uses real `setTimeout` for the 200ms windows, and resets to `idle` after each gesture completes. The 200ms constants are `HOLD_ACTION_DELAY_MS = 200` and `DOUBLE_TAP_DELAY_MS = 200`, exported from `@sireno-deck/cli` and shared across both transports.

## Root cause 2 — dbl-tap path returned the result but never called `onGesture`

`createGestureDetector`'s `second-down → up` case emitted a dbl-tap via the synchronous return path but did NOT call `onGesture?.(d)`:

```ts
// packages/cli/src/core/gesture-state.ts (BUGGY — pre-fix)
case "second-down":
  if (event.type === "up") {
    const d = dblTap(event, state.firstDownAt, state.firstUpAt, state.secondDownAt, key)
    setState(key, { name: "idle", keyIndex: key })
    return d                       // ← return value only; onGesture never called
  }
```

`RealOutputClient` (and the emulator SPA, once it switched to `createGestureDetector`) consumes gestures via the `onGesture` callback. They never see dbl-taps. Only the synchronous return value fires — and only callers that invoke `detect` and inspect the return value get dbl-taps.

Fix: call `onGesture?.(d)` before returning. Match the pattern used by `holding → 200ms timer` (line 155) and `waiting-second → 200ms timer` (line 180-186) which both invoke `onGesture` synchronously.

```ts
case "second-down":
  if (event.type === "up") {
    const d = dblTap(event, state.firstDownAt, state.firstUpAt, state.secondDownAt, key)
    setState(key, { name: "idle", keyIndex: key })
    onGesture?.(d)
    return d
  }
```

## What Didn't Work

- Using `nextGesture` in `dispatchMouseEvent` and clearing the buffer only on `hold`/`dbl-tap` results. The `tap` result did not clear the buffer, so stale events accumulated and re-fired on the next call.
- A single shared `bufferRef` in `DeckFrame` for all keys. Per-key state needs to live in the detector's `Map`, not in a UI component ref.
- Running `nextGesture` per-event on a buffer of all previous events — the synchronous state machine has no concept of "window expired", so a stale `waiting-second` from a prior key still triggered cross-key tap emissions.

## Solution

1. **Use `createGestureDetector` for any live event stream.** Reserve `nextGesture` for batch analysis ("given this complete event sequence, what's the result?"). Per-key state + 200ms timers are the contract that real hardware's USB device obeys.

2. **Per-DeckFrame detector instance, not a shared buffer.** `DeckFrame` holds a `useRef<GestureDetector>` created in `useEffect([deckId, onGesture])` with cleanup that calls `detector.reset()`. Each pointer event feeds into `detector.detect({type, timestamp, keyIndex})`. The `onGesture` callback wires to `gestureKindToWsMessage → WS button-action`.

3. **Verify the callback path for every gesture-emitting branch.** `core/gesture-state.ts` has 4 places that emit gestures: `holding → timer (hold)`, `holding → up after hold threshold (hold)`, `waiting-second → timer (tap)`, `waiting-second → up with different key (tap)`, `waiting-second → down with different key (tap)`, `second-down → up (dbl-tap)`. All six must call `onGesture?.(...)` in addition to (or instead of, for sync-only branches) returning the result.

## Why This Works

`createGestureDetector`'s per-key `Map<keyIndex, KeyState>` means button A's press/release/hold state lives in `states.get(A)`, button B's in `states.get(B)`. They cannot leak. The `setTimeout` for the 200ms tap window is owned by the per-key state — when it fires, the state must still be `waiting-second` (not `idle` because some other key reset it). The `idle → down` branch even clears other keys' `waiting-second` timers explicitly (line 138-146) so a press on any key while another is mid-window resets the first cleanly.

The `onGesture` callback is the synchronous "I just decided a gesture" notification. Without calling it, the result is lost to consumers that listen via callback only. The `tap` at the 200ms window expiry (line 180-186) is the canonical example of how `onGesture` should be wired — and the dbl-tap path must mirror it.

## Prevention

- **One detector per transport, not per message.** Both `RealOutputClient` (in `packages/cli/src/outputClient/real.ts:174`) and the emulator SPA (in `packages/cli/emulator/src/DeckFrame.tsx`) hold a single `GestureDetector` instance for the lifetime of the device / overlay. Events feed in via `detector.detect(event)`. Gestures flow out via `onGesture`.
- **Tests use `vi.useFakeTimers()` and `vi.advanceTimersByTime(...)` to drive the 200ms windows.** Synchronous assertions (`detect(down); detect(up); expect(cb).toHaveBeenCalled()`) are wrong for tap and hold — those fire on the timer. See `packages/cli/emulator/src/__tests__/gesture.test.ts` for the pattern.
- **For live streams, never accumulate a buffer across events and call `nextGesture` on the prefix.** That's exactly the bug. If you find yourself reaching for `nextGesture`, the question to ask is "do I have a complete event sequence and just want to classify it?" — yes → use `nextGesture`; no (and it's a live stream) → use `createGestureDetector`.
- **Every gesture-emitting branch in `core/gesture-state.ts` must call `onGesture`.** Add a unit test that asserts the `onGesture` callback fires for every `kind`, not just the return value. (`packages/cli/src/core/__tests__/gesture-state.test.ts` covers this for tap; the dbl-tap case was the gap.)

## Related

- `.planning/DECISIONS.md` — "Per-transport gesture detectors" entry explains why each transport owns its own detector rather than pushing detection into the runtime.
- `ARCHITECTURE.md §7.4` — Decoupling rule: each transport owns detection; only final gestures on the wire.
- `packages/cli/src/core/gesture-state.ts` — the state machine. Constants `HOLD_ACTION_DELAY_MS = 200`, `DOUBLE_TAP_DELAY_MS = 200` are the shared contract.
- `packages/cli/src/outputClient/real.ts:174` — `RealOutputClient` uses `createGestureDetector({onGesture})` correctly. Reference implementation.
- `packages/cli/emulator/src/gesture.ts` — emulator SPA's `dispatchMouseEvent` and `createEmulatorGestureDetector` wrappers.
- `packages/cli/emulator/src/__tests__/gesture.test.ts` — tests for the 200ms windows, per-key isolation, and the `gestureKindToWsMessage` shape.
