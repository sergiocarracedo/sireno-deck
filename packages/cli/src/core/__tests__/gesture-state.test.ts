import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createGestureDetector,
  DOUBLE_TAP_DELAY_MS,
  HOLD_ACTION_DELAY_MS,
  type GestureDetector,
  type GestureEvent,
  type GestureResult,
} from "../gesture-state"

const down = (timestamp: number, keyIndex?: number): GestureEvent => ({
  type: "down",
  timestamp,
  keyIndex,
})
const up = (timestamp: number, keyIndex?: number): GestureEvent => ({
  type: "up",
  timestamp,
  keyIndex,
})

const nullOr = (r: GestureResult | null): GestureResult | null => r

describe("createGestureDetector", () => {
  let cb: ReturnType<typeof vi.fn<(r: GestureResult) => void>>
  let detector: GestureDetector
  let fakeNow: number

  beforeEach(() => {
    vi.useFakeTimers()
    cb = vi.fn<(r: GestureResult) => void>()
    detector = createGestureDetector({ onGesture: cb })
    fakeNow = 0
    vi.setSystemTime(fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const advance = (ms: number) => {
    fakeNow += ms
    vi.setSystemTime(fakeNow)
    vi.advanceTimersByTime(ms)
  }

  const detect = (event: GestureEvent): GestureResult | null => {
    return nullOr(detector.detect(event))
  }

  describe("short press → tap (returned via callback after DOUBLE_TAP_DELAY_MS)", () => {
    it("down-up under HOLD delay: tap callback fires after DOUBLE_TAP_DELAY_MS", () => {
      detect(down(0))
      advance(49)
      detect(up(50))
      advance(DOUBLE_TAP_DELAY_MS + 1)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb.mock.calls[0]![0]!.kind).toBe("tap")
      expect(cb.mock.calls[0]![0]!.durationMs).toBe(50)
    })

    it("tap carries keyIndex", () => {
      detect(down(0, 7))
      advance(49)
      detect(up(50, 7))
      advance(DOUBLE_TAP_DELAY_MS + 1)
      expect(cb.mock.calls[0]![0]!.keyIndex).toBe(7)
    })
  })

  describe("long press → hold", () => {
    it("down-up above HOLD delay: hold returned on up", () => {
      detect(down(0))
      advance(499)
      const result = detect(up(600))
      expect(result?.kind).toBe("hold")
    })

    it("hold fires via callback at HOLD delay if key still held", () => {
      detect(down(0))
      advance(HOLD_ACTION_DELAY_MS + 1)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb.mock.calls[0]![0]!.kind).toBe("hold")
    })

    it("up arriving after hold timer fires: returns hold (duration-based)", () => {
      detect(down(0))
      advance(HOLD_ACTION_DELAY_MS + 1)
      expect(cb).toHaveBeenCalledTimes(1)
      cb.mockClear()
      const result = detect(up(HOLD_ACTION_DELAY_MS + 100))
      expect(result?.kind).toBe("hold")
    })

    it("hold carries keyIndex and duration", () => {
      detect(down(100, 3))
      advance(HOLD_ACTION_DELAY_MS)
      const result = detect(up(800, 3))
      expect(result?.kind).toBe("hold")
      expect(result?.keyIndex).toBe(3)
    })

    it("boundary at HOLD delay is a hold", () => {
      detect(down(0))
      advance(HOLD_ACTION_DELAY_MS)
      const result = detect(up(HOLD_ACTION_DELAY_MS))
      expect(result?.kind).toBe("hold")
    })
  })

  describe("double tap", () => {
    it("two taps within DOUBLE_TAP_DELAY_MS: dbl-tap returned on second up", () => {
      detect(down(0))
      advance(49)
      detect(up(50))
      advance(50)
      detect(down(100))
      advance(50)
      const result = detect(up(200))
      expect(result?.kind).toBe("dbl-tap")
      expect(result?.timestamps).toEqual([0, 50, 100, 200])
    })

    it("first tap callback is cancelled by second down; dbl-tap callback fires", () => {
      detect(down(0))
      advance(49)
      detect(up(50))
      advance(100)
      detect(down(150))
      advance(50)
      detect(up(200))
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb.mock.calls[0]![0]!.kind).toBe("dbl-tap")
      advance(DOUBLE_TAP_DELAY_MS + 1)
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it("two taps separated by > DOUBLE_TAP_DELAY_MS: first tap via callback, second tap via callback", () => {
      detect(down(0))
      advance(49)
      detect(up(50))
      advance(DOUBLE_TAP_DELAY_MS + 1)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb.mock.calls[0]![0]!.kind).toBe("tap")
      cb.mockClear()

      detect(down(DOUBLE_TAP_DELAY_MS + 100))
      advance(49)
      const result = detect(up(DOUBLE_TAP_DELAY_MS + 150))
      expect(result).toBeNull()
      advance(DOUBLE_TAP_DELAY_MS + 1)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb.mock.calls[0]![0]!.kind).toBe("tap")
    })

    it("dbl-tap carries keyIndex and total duration", () => {
      detect(down(0, 2))
      advance(49)
      detect(up(50, 2))
      advance(50)
      detect(down(100, 2))
      advance(50)
      const result = detect(up(200, 2))
      expect(result?.kind).toBe("dbl-tap")
      expect(result?.keyIndex).toBe(2)
      expect(result?.durationMs).toBe(200)
    })
  })

  describe("null cases", () => {
    it("empty event returns null", () => {
      expect(detect(up(0))).toBeNull()
    })

    it("single down returns null", () => {
      expect(detect(down(0))).toBeNull()
    })
  })

  describe("multi-key isolation", () => {
    it("second key's short press returns tap independently", () => {
      detect(down(0, 0))
      advance(49)
      detect(up(50, 0))
      advance(DOUBLE_TAP_DELAY_MS + 1)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb.mock.calls[0]![0]!.kind).toBe("tap")
    })

    it("different key cancels pending tap and starts fresh", () => {
      detect(down(0, 0))
      advance(49)
      detect(up(50, 0))
      advance(100)
      detect(down(200, 1))
      advance(49)
      const result = detect(up(250, 1))
      expect(result).toBeNull()
      advance(DOUBLE_TAP_DELAY_MS + 1)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb.mock.calls[0]![0]!.kind).toBe("tap")
    })
  })

  describe("reset", () => {
    it("clears all timers and pending callbacks", () => {
      detect(down(0))
      advance(49)
      detect(up(50))
      advance(100)
      detector.reset()
      advance(DOUBLE_TAP_DELAY_MS + 1)
      expect(cb).not.toHaveBeenCalled()
    })
  })
})
