# Quick Task 001: Fix gesture state machine — Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Task Boundary

Emulator button actions are mis-detected: after the first click every event is
classified as `dbl-tap`, and `hold` is never emitted. Root cause is in
`packages/cli/src/core/gesture-state.ts` and
`packages/cli/frontend-emulator/src/gesture.ts`.
</domain>

<decisions>
## Implementation Decisions

### Buffer accumulation in `dispatchMouseEvent`
- `dispatchMouseEvent` always appends to the buffer (`[...buffer, newEvent]`)
  and never clears it after a gesture is detected. The state machine is
  re-fed the entire history on every new event, so click 2 replays
  `[down1, up1, down2, up2]` → dbl-tap.
- **Fix**: when `nextGesture` returns a non-null result, slice the buffer to
  only the consumed events. Use `result.timestamps.length` to know how many
  events were consumed (the result timestamps reflect exactly the events
  used to detect the gesture).

### Premature tap emission
- `nextGesture` returns `tap` from the cleanup at end of `await-second` state
  *immediately* after `[down, up]`. There's no delay for a potential second
  tap → dbl-tap upgrade.
- **Fix**: change `nextGesture` to return `null` when in `await-second` state
  (no cleanup emit). Have `dispatchMouseEvent` schedule a 200 ms timer
  (`DOUBLE_TAP_DELAY_MS`) to commit the tap. If a new event arrives in that
  window, cancel the timer and replay.

### Hold
- Hold detection (`duration >= HOLD_ACTION_DELAY_MS = 600`) works in the
  state machine. The bug was that buffer accumulation caused every hold to
  be replayed against a stale state. The buffer fix above restores correct
  hold behavior.

### Agent's Discretion
- Whether to use `setTimeout` or `queueMicrotask` for the tap commit timer
  (decided: `setTimeout` to honor the 200 ms wall-clock delay).
- Whether to debounce subsequent same-button clicks within DOUBLE_TAP_DELAY_MS
  to avoid double-firing (decided: keep current behavior — emit tap first,
  upgrade to dbl-tap if a second tap arrives).

</decisions>

<specifics>
## Specific Ideas

- User verbatim: *"after the frist click everywinth is detected as double tap,
  hold is not beeingh triggered"*.
- The fix must not break the existing gesture tests in
  `packages/cli/src/core/gesture-state.test.ts`.
</specifics>