export const HOLD_ACTION_DELAY_MS = 200
export const DOUBLE_TAP_DELAY_MS = 200

export const SPA_HOLD_DELAY_MS = 500
export const SPA_DOUBLE_TAP_DELAY_MS = 300

export type GestureType = "down" | "up"

export interface GestureEvent {
  readonly type: GestureType
  readonly timestamp: number
  readonly keyIndex?: number
}

export type GestureKind = "tap" | "dbl-tap" | "hold"

export interface GestureResult {
  readonly kind: GestureKind
  readonly keyIndex?: number
  readonly timestamp: number
  readonly durationMs?: number
  readonly timestamps?: ReadonlyArray<number>
}

type KeyState =
  | { name: "idle"; keyIndex?: number }
  | {
      name: "holding"
      downAt: number
      timer?: ReturnType<typeof setTimeout>
      keyIndex?: number
      emittedHold?: boolean
    }
  | {
      name: "waiting-second"
      firstUpAt: number
      firstDownAt: number
      timer?: ReturnType<typeof setTimeout>
      keyIndex?: number
    }
  | {
      name: "second-down"
      secondDownAt: number
      firstUpAt: number
      firstDownAt: number
      keyIndex?: number
    }

const tap = (
  upEvent: GestureEvent,
  downAt: number,
  keyIndex?: number,
): GestureResult =>
  Object.freeze({
    kind: "tap",
    timestamp: upEvent.timestamp,
    durationMs: upEvent.timestamp - downAt,
    timestamps: Object.freeze([downAt, upEvent.timestamp]),
    ...(keyIndex !== undefined ? { keyIndex } : {}),
  })

const dblTap = (
  upEvent: GestureEvent,
  firstDownAt: number,
  firstUpAt: number,
  secondDownAt: number,
  keyIndex?: number,
): GestureResult =>
  Object.freeze({
    kind: "dbl-tap",
    timestamp: upEvent.timestamp,
    durationMs: upEvent.timestamp - firstDownAt,
    timestamps: Object.freeze([
      firstDownAt,
      firstUpAt,
      secondDownAt,
      upEvent.timestamp,
    ]),
    ...(keyIndex !== undefined ? { keyIndex } : {}),
  })

const hold = (
  timestamp: number,
  downAt: number,
  keyIndex?: number,
): GestureResult =>
  Object.freeze({
    kind: "hold",
    timestamp,
    durationMs: timestamp - downAt,
    timestamps: Object.freeze([downAt, timestamp]),
    ...(keyIndex !== undefined ? { keyIndex } : {}),
  })

const clearTimer = (timer: ReturnType<typeof setTimeout> | undefined): void => {
  if (timer !== undefined) clearTimeout(timer)
}

export interface GestureDetectorOptions {
  readonly onGesture?: (result: GestureResult) => void
}

export interface GestureDetector {
  detect(event: GestureEvent): GestureResult | null
  reset(): void
}

const createKeyState = (keyIndex: number | undefined): KeyState => ({
  name: "idle",
  keyIndex,
})

export const createGestureDetector = (
  options: GestureDetectorOptions = {},
): GestureDetector => {
  const states = new Map<number, KeyState>()
  const { onGesture } = options

  const getOrCreateState = (keyIndex: number | undefined): KeyState => {
    const k = keyIndex ?? -1
    const existing = states.get(k)
    if (existing !== undefined) return existing
    const s = createKeyState(keyIndex)
    if (keyIndex !== undefined) states.set(k, s)
    return s
  }

  const setState = (keyIndex: number | undefined, next: KeyState): void => {
    const k = keyIndex ?? -1
    if (k !== undefined) states.set(k, next)
  }

  const detect = (event: GestureEvent): GestureResult | null => {
    const key = event.keyIndex
    const state = getOrCreateState(key)
    const k = key ?? -1

    switch (state.name) {
      case "idle":
        if (event.type === "down") {
          for (const [otherK, otherState] of states) {
            if (otherState.name === "waiting-second") {
              clearTimer(otherState.timer)
              states.set(otherK, {
                name: "idle",
                keyIndex: otherState.keyIndex,
              })
            }
          }
          const downAt = event.timestamp
          const newState: KeyState = {
            name: "holding",
            downAt,
            timer: setTimeout(() => {
              const s = states.get(k)
              if (s?.name === "holding") {
                s.emittedHold = true
                onGesture?.(hold(downAt + HOLD_ACTION_DELAY_MS, downAt, key))
              }
            }, HOLD_ACTION_DELAY_MS),
            keyIndex: key,
          }
          setState(key, newState)
          return null
        }
        break

      case "holding": {
        if (event.type === "up") {
          const duration = event.timestamp - state.downAt
          clearTimer(state.timer)
          if (duration >= HOLD_ACTION_DELAY_MS) {
            setState(key, { name: "idle", keyIndex: key })
            return hold(event.timestamp, state.downAt, key)
          }
          const newState: KeyState = {
            name: "waiting-second",
            firstUpAt: event.timestamp,
            firstDownAt: state.downAt,
            timer: setTimeout(() => {
              const s = states.get(k)
              if (s?.name === "waiting-second") {
                onGesture?.(
                  tap(
                    { type: "up", timestamp: s.firstUpAt, keyIndex: key },
                    s.firstDownAt,
                    key,
                  ),
                )
                states.delete(k)
              }
            }, DOUBLE_TAP_DELAY_MS),
            keyIndex: key,
          }
          setState(key, newState)
          return null
        }
        break
      }

      case "waiting-second": {
        clearTimer(state.timer)
        if (event.type === "down") {
          if (event.keyIndex !== key) {
            const t = tap(
              { type: "up", timestamp: state.firstUpAt, keyIndex: key },
              state.firstDownAt,
              key,
            )
            onGesture?.(t)
            setState(key, { name: "idle", keyIndex: key })
            return null
          }
          const newState: KeyState = {
            name: "second-down",
            firstUpAt: state.firstUpAt,
            firstDownAt: state.firstDownAt,
            secondDownAt: event.timestamp,
            keyIndex: key,
          }
          setState(key, newState)
          return null
        }
        if (event.type === "up") {
          const t = tap(event, state.firstDownAt, key)
          setState(key, { name: "idle", keyIndex: key })
          return t
        }
        break
      }

      case "second-down":
        if (event.type === "up") {
          const d = dblTap(
            event,
            state.firstDownAt,
            state.firstUpAt,
            state.secondDownAt,
            key,
          )
          setState(key, { name: "idle", keyIndex: key })
          onGesture?.(d)
          return d
        }
        break
    }

    return null
  }

  const reset = (): void => {
    for (const s of states.values()) {
      if (s.name === "holding") clearTimer(s.timer)
      if (s.name === "waiting-second") clearTimer(s.timer)
    }
    states.clear()
  }

  return Object.freeze({ detect, reset })
}

export const nextGesture = (
  events: ReadonlyArray<GestureEvent>,
): GestureResult | null => {
  let state: KeyState = { name: "idle" }

  for (const event of events) {
    switch (state.name) {
      case "idle":
        if (event.type === "down") {
          state = {
            name: "holding",
            downAt: event.timestamp,
            timer: undefined,
            keyIndex: event.keyIndex,
          }
        }
        break

      case "holding":
        if (event.type === "up") {
          const duration = event.timestamp - state.downAt
          if (duration >= HOLD_ACTION_DELAY_MS) {
            return hold(event.timestamp, state.downAt, state.keyIndex)
          }
          state = {
            name: "waiting-second",
            firstUpAt: event.timestamp,
            firstDownAt: state.downAt,
            timer: undefined,
            keyIndex: state.keyIndex,
          }
        }
        break

      case "waiting-second":
        if (event.type === "down") {
          if (event.keyIndex !== state.keyIndex) {
            return tap(
              {
                type: "up",
                timestamp: state.firstUpAt,
                keyIndex: state.keyIndex,
              },
              state.firstDownAt,
              state.keyIndex,
            )
          }
          state = {
            name: "second-down",
            firstUpAt: state.firstUpAt,
            firstDownAt: state.firstDownAt,
            secondDownAt: event.timestamp,
            keyIndex: state.keyIndex,
          }
        } else if (event.type === "up") {
          return tap(event, state.firstDownAt, state.keyIndex)
        }
        break

      case "second-down":
        if (event.type === "up") {
          return dblTap(
            event,
            state.firstDownAt,
            state.firstUpAt,
            state.secondDownAt,
            state.keyIndex,
          )
        }
        break
    }
  }

  if (state.name === "waiting-second") {
    return tap(
      { type: "up", timestamp: state.firstUpAt, keyIndex: state.keyIndex },
      state.firstDownAt,
      state.keyIndex,
    )
  }

  return null
}
