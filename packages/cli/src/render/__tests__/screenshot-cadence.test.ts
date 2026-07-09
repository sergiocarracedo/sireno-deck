import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createLogger } from "@/util/logger"

import { CadenceTimer, EventDebouncer } from "../screenshot-cadence"

const silentLogger = () => createLogger({ level: "silent" })

describe("CadenceTimer", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("schedules first tick after intervalMs", () => {
    const onTick = vi.fn()
    const t = new CadenceTimer({
      intervalMs: 500,
      onTick,
      logger: silentLogger(),
    })
    t.start()
    expect(onTick).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(onTick).toHaveBeenCalledTimes(1)
    t.stop()
  })

  it("does not overlap: each tick awaits the previous callback", async () => {
    let resolveTick: () => void = () => undefined
    const onTick = vi.fn(() => new Promise<void>((r) => (resolveTick = r)))
    const t = new CadenceTimer({
      intervalMs: 100,
      onTick,
      logger: silentLogger(),
    })
    t.start()
    vi.advanceTimersByTime(100)
    expect(onTick).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    expect(onTick).toHaveBeenCalledTimes(1)
    resolveTick()
    await Promise.resolve()
    vi.advanceTimersByTime(100)
    expect(onTick).toHaveBeenCalledTimes(2)
    t.stop()
  })

  it("stop() cancels pending tick", () => {
    const onTick = vi.fn()
    const t = new CadenceTimer({
      intervalMs: 100,
      onTick,
      logger: silentLogger(),
    })
    t.start()
    t.stop()
    vi.advanceTimersByTime(500)
    expect(onTick).not.toHaveBeenCalled()
  })
})

describe("EventDebouncer", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("trigger() schedules flush after delay", () => {
    const onFlush = vi.fn()
    const d = new EventDebouncer({
      delayMs: 50,
      onFlush,
      logger: silentLogger(),
    })
    d.trigger()
    vi.advanceTimersByTime(50)
    expect(onFlush).toHaveBeenCalledTimes(1)
    d.dispose()
  })

  it("multiple triggers within delayMs coalesce into one flush", () => {
    const onFlush = vi.fn()
    const d = new EventDebouncer({
      delayMs: 50,
      onFlush,
      logger: silentLogger(),
    })
    d.trigger()
    vi.advanceTimersByTime(20)
    d.trigger()
    vi.advanceTimersByTime(20)
    d.trigger()
    vi.advanceTimersByTime(30)
    expect(onFlush).not.toHaveBeenCalled()
    vi.advanceTimersByTime(30)
    expect(onFlush).toHaveBeenCalledTimes(1)
    d.dispose()
  })

  it("dispose() cancels pending flush", () => {
    const onFlush = vi.fn()
    const d = new EventDebouncer({
      delayMs: 50,
      onFlush,
      logger: silentLogger(),
    })
    d.trigger()
    d.dispose()
    vi.advanceTimersByTime(100)
    expect(onFlush).not.toHaveBeenCalled()
  })
})
