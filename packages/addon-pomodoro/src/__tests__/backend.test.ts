import { afterEach, describe, expect, it, vi } from "vitest"

import { globalService } from "../global/backend"
import { POMO_CHANNEL } from "../shared/state"

const makeCtx = () => {
  return {
    ctx: {
      publish: vi.fn(),
      poll: vi.fn(),
      signal: new AbortController().signal,
      executor: { run: vi.fn() },
    },
  }
}

describe("pomodoro globalService", () => {
  afterEach(() => {
    globalService.onUnload?.()
  })

  it("publishes state on poll", () => {
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    const poll = globalService.pollers?.[0]
    expect(poll).toBeDefined()
    if (poll) {
      poll.poll()
    }
  })

  it("registers a channel and an interval", () => {
    expect(globalService.pollers?.[0]?.channel).toBe(POMO_CHANNEL)
    expect(globalService.pollers?.[0]?.intervalMs).toBe(1000)
  })

  it("start/stop methods track button state", () => {
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    globalService.methods?.["start"]?.("btn1", 60)
    globalService.methods?.["stop"]?.("btn1")
  })

  it("isFinished returns true when elapsed past duration", () => {
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    globalService.methods?.["startWith"]?.("btn1", Date.now() - 10_000, 5)
    expect(globalService.methods?.["isFinished"]?.("btn1")).toBe(true)
  })

  it("isFinished returns false for stopped button", () => {
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    globalService.methods?.["stop"]?.("btn1")
    expect(globalService.methods?.["isFinished"]?.("btn1")).toBe(false)
  })

  it("register is a no-op when durationSec is invalid", () => {
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    expect(() =>
      globalService.methods?.["register"]?.("btn1", -1),
    ).not.toThrow()
    expect(() =>
      globalService.methods?.["register"]?.("btn1", "not a number"),
    ).not.toThrow()
  })

  it("onUnload clears state", () => {
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    globalService.methods?.["start"]?.("btn1", 60)
    globalService.onUnload?.()
    expect(globalService.methods?.["isFinished"]?.("btn1")).toBe(false)
  })
})
