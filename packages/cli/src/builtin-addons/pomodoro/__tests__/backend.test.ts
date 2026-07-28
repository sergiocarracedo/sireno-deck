import { afterEach, describe, expect, it, vi } from "vitest"

import { globalService } from "../backend"
import { POMO_CHANNEL } from "../state"

interface PubSubLike {
  publish: (channel: string, data: unknown) => void
}

const makeCtx = () => {
  const pubSub: PubSubLike = { publish: vi.fn() }
  return {
    ctx: {
      publish: (data: unknown) => pubSub.publish(POMO_CHANNEL, data),
      poll: vi.fn(),
      signal: new AbortController().signal,
      executor: { run: vi.fn() },
    },
    pubSub,
  }
}

describe("pomodoro globalService", () => {
  afterEach(() => {
    globalService.onUnload()
  })

  it("publishes state on poll", () => {
    const { ctx, pubSub } = makeCtx()
    globalService.onLoad(ctx)
    const poll = globalService.pollers?.[0]
    expect(poll).toBeDefined()
    if (poll) {
      poll.poll(ctx)
    }
    expect(pubSub.publish).toHaveBeenCalled()
  })

  it("start/stop methods track button state", () => {
    const { ctx, pubSub } = makeCtx()
    globalService.onLoad(ctx)
    globalService.methods?.["start"]?.("btn1", 60)
    globalService.methods?.["stop"]?.("btn1")
    expect(pubSub.publish).toHaveBeenCalled()
  })

  it("isFinished returns true when elapsed past duration", () => {
    const { ctx } = makeCtx()
    globalService.onLoad(ctx)
    globalService.methods?.["startWith"]?.(
      "btn1",
      Date.now() - 10_000,
      5,
    )
    expect(globalService.methods?.["isFinished"]?.("btn1")).toBe(true)
  })

  it("isFinished returns false for stopped button", () => {
    const { ctx } = makeCtx()
    globalService.onLoad(ctx)
    globalService.methods?.["stop"]?.("btn1")
    expect(globalService.methods?.["isFinished"]?.("btn1")).toBe(false)
  })

  it("register is a no-op when durationSec is invalid", () => {
    const { ctx } = makeCtx()
    globalService.onLoad(ctx)
    expect(() =>
      globalService.methods?.["register"]?.("btn1", -1),
    ).not.toThrow()
    expect(() =>
      globalService.methods?.["register"]?.("btn1", "not a number"),
    ).not.toThrow()
  })

  it("onUnload clears state", () => {
    const { ctx } = makeCtx()
    globalService.onLoad(ctx)
    globalService.methods?.["start"]?.("btn1", 60)
    globalService.onUnload()
    expect(globalService.methods?.["isFinished"]?.("btn1")).toBe(false)
  })
})