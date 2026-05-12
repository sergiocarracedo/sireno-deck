import { describe, expect, it, vi } from "vitest"

import { createPollingScheduler } from "./scheduler.js"

describe("polling scheduler", () => {
  it("uses a 500ms default interval", () => {
    const scheduler = createPollingScheduler({ random: () => 0.5 })

    expect(scheduler.intervalMs).toBe(500)
    expect(scheduler.scheduleDelay(0)).toBe(500)
  })

  it("keeps jitter within the configured bounds", () => {
    const scheduler = createPollingScheduler({ intervalMs: 500, jitterMs: 40, random: () => 1 })

    expect(scheduler.scheduleDelay(2)).toBeLessThanOrEqual(500 + 2 * 17 + 40 + 1)
    expect(scheduler.scheduleDelay(2)).toBeGreaterThanOrEqual(500 + 2 * 17 - 40)
  })

  it("cancels scheduled polling on stop", () => {
    const clearScheduledTimeout = vi.fn()
    const scheduleTimeout = vi.fn((callback: () => void, _delay: number) => {
      callback()
      return 123 as unknown as ReturnType<typeof setTimeout>
    })
    const scheduler = createPollingScheduler({
      clearScheduledTimeout,
      random: () => 0.5,
      scheduleTimeout,
    })

    scheduler.start([{ id: "key-0", run: vi.fn() }])
    scheduler.stop()

    expect(scheduleTimeout).toHaveBeenCalled()
    expect(clearScheduledTimeout).toHaveBeenCalledWith(123)
  })
})
