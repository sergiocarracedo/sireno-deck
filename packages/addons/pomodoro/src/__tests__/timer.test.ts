import { describe, expect, it, vi } from "vitest"

import { createPomodoroTimer } from "../shared/timer"
import type { PomodoroSnapshot } from "../shared/state"

const fakeClock = (start: number) => {
  let now = start
  const fn = (): number => now
  return Object.assign(fn, {
    advance: (ms: number): void => {
      now += ms
    },
  })
}

describe("createPomodoroTimer", () => {
  it("starts a 1s ticker that recomputes remaining time", () => {
    const now = fakeClock(1_000_000)
    const intervals: Array<() => void> = []
    const timer = createPomodoroTimer({
      now,
      setInterval: (fn) => {
        intervals.push(fn)
        return 0 as unknown as NodeJS.Timeout
      },
      clearInterval: () => undefined,
    })
    timer.setSnapshot({
      btn1: { status: "running", remainingSec: 10, totalSec: 10 },
    })
    timer.start()
    expect(intervals.length).toBe(1)
    intervals[0]?.()
    now.advance(1_000)
    intervals[0]?.()
  })

  it("transitions to finished when elapsed", () => {
    const now = fakeClock(1_000_000)
    const intervals: Array<() => void> = []
    const timer = createPomodoroTimer({
      now,
      setInterval: (fn) => {
        intervals.push(fn)
        return 0 as unknown as NodeJS.Timeout
      },
      clearInterval: () => undefined,
    })
    timer.setSnapshot({
      btn1: { status: "running", remainingSec: 1, totalSec: 5 },
    })
    timer.start()
    now.advance(6_000)
    intervals[0]?.()
    const snap = timer.getSnapshot() as PomodoroSnapshot
    expect(snap.btn1?.status).toBe("finished")
  })

  it("stop() clears the timer", () => {
    const now = fakeClock(1_000_000)
    let cleared = 0
    const timer = createPomodoroTimer({
      now,
      setInterval: () => 0 as unknown as NodeJS.Timeout,
      clearInterval: () => {
        cleared += 1
      },
    })
    timer.start()
    timer.stop()
    expect(cleared).toBe(1)
  })
})
