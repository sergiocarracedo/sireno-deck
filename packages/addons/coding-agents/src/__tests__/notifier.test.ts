import { describe, expect, it, vi } from "vitest"

import { NotificationThrottle } from "../shared/notifier"

describe("NotificationThrottle", () => {
  it("fires on first attention status", () => {
    const notify = vi.fn()
    const t = new NotificationThrottle({ notify })
    expect(
      t.evaluate({
        providerId: "opencode",
        sessionId: "a",
        status: "waiting_for_human",
        title: "x",
        body: "y",
      }),
    ).toBe(true)
    expect(notify).toHaveBeenCalledOnce()
  })

  it("dedupes same status twice", () => {
    const notify = vi.fn()
    const t = new NotificationThrottle({ notify })
    t.evaluate({
      providerId: "opencode",
      sessionId: "a",
      status: "waiting_for_human",
      title: "x",
      body: "y",
    })
    expect(
      t.evaluate({
        providerId: "opencode",
        sessionId: "a",
        status: "waiting_for_human",
        title: "x",
        body: "y",
      }),
    ).toBe(false)
    expect(notify).toHaveBeenCalledOnce()
  })

  it("fires again on transition to a different attention status", () => {
    const notify = vi.fn()
    const t = new NotificationThrottle({ notify })
    t.evaluate({
      providerId: "opencode",
      sessionId: "a",
      status: "waiting_for_human",
      title: "x",
      body: "y",
    })
    expect(
      t.evaluate({
        providerId: "opencode",
        sessionId: "a",
        status: "error",
        title: "x",
        body: "y",
      }),
    ).toBe(true)
    expect(notify).toHaveBeenCalledTimes(2)
  })

  it("does not fire for non-attention statuses", () => {
    const notify = vi.fn()
    const t = new NotificationThrottle({ notify })
    expect(
      t.evaluate({
        providerId: "opencode",
        sessionId: "a",
        status: "running",
        title: "x",
        body: "y",
      }),
    ).toBe(false)
    expect(notify).not.toHaveBeenCalled()
  })

  it("forget allows a re-notify on the same status", () => {
    const notify = vi.fn()
    const t = new NotificationThrottle({ notify })
    t.evaluate({
      providerId: "opencode",
      sessionId: "a",
      status: "waiting_for_human",
      title: "x",
      body: "y",
    })
    t.forget("opencode", "a")
    expect(
      t.evaluate({
        providerId: "opencode",
        sessionId: "a",
        status: "waiting_for_human",
        title: "x",
        body: "y",
      }),
    ).toBe(true)
    expect(notify).toHaveBeenCalledTimes(2)
  })

  it("reset clears all state", () => {
    const notify = vi.fn()
    const t = new NotificationThrottle({ notify })
    t.evaluate({
      providerId: "opencode",
      sessionId: "a",
      status: "error",
      title: "x",
      body: "y",
    })
    t.reset()
    expect(
      t.evaluate({
        providerId: "opencode",
        sessionId: "a",
        status: "error",
        title: "x",
        body: "y",
      }),
    ).toBe(true)
  })
})
