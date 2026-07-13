import { describe, expect, it, vi } from "vitest"

import { DOUBLE_TAP_DELAY_MS, HOLD_ACTION_DELAY_MS } from "@sireno-deck/cli"

import {
  createEmulatorGestureDetector,
  dispatchMouseEvent,
  gestureKindToWsMessage,
} from "../gesture"

const advance = (ms: number): void => {
  vi.advanceTimersByTime(ms)
}

describe("gesture (emulator)", () => {
  it("emits tap after the 200ms window closes on a fast press+release", () => {
    vi.useFakeTimers()
    const onGesture = vi.fn()
    const detector = createEmulatorGestureDetector(onGesture)

    dispatchMouseEvent(detector, { kind: "down", keyIndex: 0, timestamp: 0 })
    dispatchMouseEvent(detector, { kind: "up", keyIndex: 0, timestamp: 50 })
    expect(onGesture).not.toHaveBeenCalled()

    advance(DOUBLE_TAP_DELAY_MS + 1)
    expect(onGesture).toHaveBeenCalledTimes(1)
    expect(onGesture.mock.calls[0]![0]!.kind).toBe("tap")
    expect(onGesture.mock.calls[0]![0]!.keyIndex).toBe(0)
  })

  it("emits hold at the 200ms threshold when release is after", () => {
    vi.useFakeTimers()
    const onGesture = vi.fn()
    const detector = createEmulatorGestureDetector(onGesture)

    dispatchMouseEvent(detector, { kind: "down", keyIndex: 3, timestamp: 0 })
    expect(onGesture).not.toHaveBeenCalled()
    advance(HOLD_ACTION_DELAY_MS + 1)
    expect(onGesture).toHaveBeenCalledTimes(1)
    expect(onGesture.mock.calls[0]![0]!.kind).toBe("hold")

    dispatchMouseEvent(detector, { kind: "up", keyIndex: 3, timestamp: 1000 })
    expect(onGesture).toHaveBeenCalledTimes(1)
  })

  it("emits dbl-tap only when the second release is within 200ms of the first", () => {
    vi.useFakeTimers()
    const onGesture = vi.fn()
    const detector = createEmulatorGestureDetector(onGesture)

    dispatchMouseEvent(detector, { kind: "down", keyIndex: 1, timestamp: 0 })
    dispatchMouseEvent(detector, { kind: "up", keyIndex: 1, timestamp: 50 })
    expect(onGesture).not.toHaveBeenCalled()

    advance(DOUBLE_TAP_DELAY_MS + 10)
    dispatchMouseEvent(detector, { kind: "down", keyIndex: 1, timestamp: 300 })
    dispatchMouseEvent(detector, { kind: "up", keyIndex: 1, timestamp: 350 })
    expect(onGesture).toHaveBeenCalledTimes(1)
    expect(onGesture.mock.calls[0]![0]!.kind).toBe("tap")
  })

  it("emits dbl-tap when second release lands inside the 200ms window", () => {
    vi.useFakeTimers()
    const onGesture = vi.fn()
    const detector = createEmulatorGestureDetector(onGesture)

    dispatchMouseEvent(detector, { kind: "down", keyIndex: 2, timestamp: 0 })
    dispatchMouseEvent(detector, { kind: "up", keyIndex: 2, timestamp: 50 })
    dispatchMouseEvent(detector, { kind: "down", keyIndex: 2, timestamp: 100 })
    dispatchMouseEvent(detector, { kind: "up", keyIndex: 2, timestamp: 150 })
    expect(onGesture).toHaveBeenCalledTimes(1)
    expect(onGesture.mock.calls[0]![0]!.kind).toBe("dbl-tap")
    expect(onGesture.mock.calls[0]![0]!.keyIndex).toBe(2)
  })

  it("isolates per-key state — clicking key B after key A is not dbl-tap on A", () => {
    vi.useFakeTimers()
    const onGesture = vi.fn()
    const detector = createEmulatorGestureDetector(onGesture)

    dispatchMouseEvent(detector, { kind: "down", keyIndex: 0, timestamp: 0 })
    dispatchMouseEvent(detector, { kind: "up", keyIndex: 0, timestamp: 50 })
    advance(DOUBLE_TAP_DELAY_MS + 10)
    dispatchMouseEvent(detector, { kind: "down", keyIndex: 5, timestamp: 300 })
    dispatchMouseEvent(detector, { kind: "up", keyIndex: 5, timestamp: 320 })
    expect(onGesture).toHaveBeenCalledTimes(1)
    expect(onGesture.mock.calls[0]![0]!.kind).toBe("tap")
    expect(onGesture.mock.calls[0]![0]!.keyIndex).toBe(0)
  })

  it("gestureKindToWsMessage carries deckId, position, gesture", () => {
    const r = {
      kind: "tap" as const,
      keyIndex: 7,
      timestamp: 0,
      durationMs: 50,
      timestamps: [0, 50],
    }
    const msg = gestureKindToWsMessage(r, "media")
    expect(msg).toEqual({
      type: "button-action",
      deckId: "media",
      position: 7,
      gesture: "tap",
    })
  })
})
