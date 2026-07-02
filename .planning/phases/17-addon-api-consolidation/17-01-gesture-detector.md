# Plan 17-01 — Gesture Detector (Timer-Based Hold Detection)

## Gap

`core/gesture-state.ts:74-142` — `nextGesture()` returns `hold` only when `up` fires after a long press. It does **not** fire `hold` 500ms after `down`. The current state machine:
- `idle` → `down`: records `downAt`
- `down` → `up`: if duration ≥ 500ms → `hold`; otherwise → `await-second`
- `await-second` → `down` (same key) → `second-down`
- `second-down` → `up`: `dbl-tap`

This means the UI **never shows hold progress** until the user releases. A proper gesture detector fires `hold` 500ms after key-down (with progress updates), suppresses `up`-after-hold, and fires `tap` on short release.

## Approach

Replace the stateless event-list reducer with a per-key timer-based state machine:

```
idle ──down──► down (start 500ms hold timer)
                  │
                  │ hold timer fires ──► emit "hold"
                  │
                  └──up (no timer fired)──► tap (if ≤500ms and no second down)
                                            └── if second-down seen → dbl-tap
```

### Hold timer fires at 500ms

```ts
export const HOLD_DELAY_MS = 500
export const DOUBLE_TAP_WINDOW_MS = 500

type PerKeyState =
  | { name: "idle" }
  | { name: "waiting-second"; keyIndex: number; firstUpAt: number }
  | { name: "second-down-seen"; keyIndex: number; secondDownAt: number }

type HoldingState = {
  name: "holding"
  keyIndex: number
  downAt: number
  timer: ReturnType<typeof setTimeout>
  fireHoldEmitted: boolean  // prevent double-fire
}

const activeTimers = new Map<number, HoldingState>()

export const nextGesture = (
  event: GestureEvent,
): GestureResult | null => { ... }
```

### Event handler

```ts
export const handleKeyEvent = (
  event: GestureEvent,
): GestureResult | null => {
  const key = event.keyIndex ?? 0

  switch (state(event.keyIndex)) {
    case "idle":
      if (event.type === "down") {
        startHoldTimer(key, event.timestamp)
        return null  // no gesture yet
      }
      break
    case "holding":
      if (event.type === "up") {
        if (fireHoldEmitted) {
          // suppress up-after-hold
          cleanup(key)
          return null
        }
        const duration = event.timestamp - downAt
        cleanup(key)
        if (duration < DOUBLE_TAP_WINDOW_MS && hadSecondDown) {
          return makeDblTap(...)
        }
        return makeTap(...)
      }
      break
    case "waiting-second":
      if (event.type === "down") {
        if (event.keyIndex === state.keyIndex) {
          setState(key, "second-down-seen", { secondDownAt: event.timestamp })
          // set a new short timer for the second tap
          setTimeout(() => {
            // if we never got a second up, emit tap
            emitTapFromWaitingSecond(key)
          }, DOUBLE_TAP_WINDOW_MS)
          return null
        } else {
          // different key — cancel and start fresh
          emitTap(key)
          startHoldTimer(event.keyIndex, event.timestamp)
        }
      } else if (event.type === "up") {
        // short tap — start double-tap window
        setState(key, "waiting-second", { firstUpAt: event.timestamp })
        setTimeout(() => {
          if (getState(key).name === "waiting-second") {
            emitTap(key)
            setState(key, "idle")
          }
        }, DOUBLE_TAP_WINDOW_MS)
        return null
      }
      break
  }
}
```

### Per-key timer map

Use a `Map<number, { timer, state }>` to support multiple keys independently.

## Files

- `packages/cli/src/core/gesture-state.ts` — replace reducer with timer-based machine
- `packages/cli/src/core/__tests__/gesture-state.test.ts` — new tests

## Tests

- Short tap (< 500ms): `tap` fires on release
- Long press (≥ 500ms): `hold` fires at 500ms, `up` is suppressed
- Double tap (two fast taps): `tap` on first release, `dbl-tap` on second release
- Single long press (≥ 500ms) + short tap on different key: `hold` fires on first, `tap` on second release
- Multi-key interleaving: independent state per key

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```
