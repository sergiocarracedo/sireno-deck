---
title: Gesture state machine cross-button dbl-tap detection
date: 2026-06-27
category: ui-bugs
module: emulator
problem_type: ui_bug
severity: high
tags: gesture, state-machine, stream-deck, emulator, dbl-tap
---

# Gesture state machine cross-button dbl-tap detection

## Problem

In the emulator shell, clicking button A once and then clicking button B always triggered a "dbl-tap" action on button A — independent of which button was clicked. This made the emulator unusable for testing single-button actions.

## Symptoms

- First click on any button: correct "tap" gesture
- Subsequent click on ANY button (even a different one): "dbl-tap" on the first button
- Triggered reliably across all device models (mk2, plus, mini, xl)
- Reproduced 100% of the time in browser, not in unit tests

## What Didn't Work

- Investigating the WS bridge first — the bridge correctly forwarded `button-action` messages but didn't generate them
- Checking the React state in App.tsx — `setDeck` was correctly called but the gesture detection happened upstream in the emulator shell
- Looking at the emulator's DeckFrame — the buffer was being accumulated correctly, but the state machine treated all events as same-button

## Solution

Two changes:

### 1. `packages/cli/src/core/gesture-state.ts` — keyIndex check in `await-second`

When in `await-second` state and receiving a "down" event, check if the keyIndex matches the first tap's keyIndex:

```ts
case "await-second":
  if (event.type === "down") {
    if (event.keyIndex !== state.keyIndex) {
      // Different button — start tracking new gesture
      state = { name: "down", downAt: event.timestamp, keyIndex: event.keyIndex };
    } else {
      // Same button — second tap, proceed to dbl-tap detection
      state = {
        name: "second-down",
        firstUpAt: state.firstUpAt,
        firstDownAt: state.firstDownAt,
        secondDownAt: event.timestamp,
        keyIndex: state.keyIndex,
      };
    }
  }
  break;
```

### 2. `packages/cli/emulator/src/gesture.ts` — buffer cleanup after final gestures

Clear the buffer after `hold` or `dbl-tap` results to prevent unbounded growth:

```ts
const newBuffer =
  result?.kind === 'hold' || result?.kind === 'dbl-tap'
    ? []
    : [...buffer, newEvent]
return { buffer: newBuffer, result }
```

## Why This Works

The state machine's `await-second` state tracks a pending second tap. Without the keyIndex check, ANY incoming "down" was interpreted as the second tap, triggering `second-down` → `dbl-tap`. The buffer accumulated across clicks meant that two clicks on DIFFERENT buttons produced a `dbl-tap` result on the first button's keyIndex.

Adding the keyIndex check makes the state machine correctly distinguish:

- Same button, second tap → proceed to `second-down` → `dbl-tap`
- Different button → reset state, start tracking new gesture

The buffer cleanup prevents unbounded growth across many clicks — the buffer only persists between the first tap and possible second tap within the 500ms window.

## Prevention

- **Always check identity in state transitions** — when a state machine tracks a multi-step gesture across multiple inputs, verify each input belongs to the same logical gesture (e.g., same button, same context)
- **Bound stateful accumulators** — when accumulating events across calls, clear the buffer after terminal/final states to prevent memory leaks and cross-event interference
- **Test cross-button scenarios** — single-button gesture tests pass even when the state machine has this bug; add multi-button sequence tests to catch it

## Related

- `packages/cli/src/core/gesture-state.test.ts` — gesture state machine unit tests
- `packages/cli/emulator/src/gesture.test.ts` — emulator gesture dispatch tests
- Quick Task 005 (`005-gesture-and-cleanup/`) — related gesture threshold tuning (500ms hold, 500ms dbl-tap window)
