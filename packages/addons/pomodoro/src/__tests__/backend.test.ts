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

import pomodoroBackend from "../buttons/pomodoro/backend"
import type { ConfigSchema } from "../buttons/pomodoro/config"

interface ButtonScopeMock {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
}

const makeButtonCtx = (configDuration: number, persistedState: unknown) => {
  const buttonScope: ButtonScopeMock = {
    get: vi.fn((_key: string) => persistedState),
    set: vi.fn(),
  }
  const store = {
    buttonScope: vi.fn(() => buttonScope),
  }
  const ctx = {
    config: { durationSec: configDuration } as ConfigSchema,
    buttonId: "btn1",
    addonName: "pomodoro",
    methods: {} as Record<string, (...args: unknown[]) => unknown>,
    coreMethods: {} as never,
    publish: vi.fn(),
    executor: { run: vi.fn() },
    signal: new AbortController().signal,
    store,
  }
  return { ctx: ctx as never, store, buttonScope }
}

describe("pomodoro button onMount config-change reset", () => {
  it("clears stale persisted state when config.durationSec changes", () => {
    const { ctx, store, buttonScope } = makeButtonCtx(5, {
      status: "paused",
      startTsMs: Date.now() - 200_000,
      durationSec: 1500,
      remainingSec: 1296,
    })
    const stop = vi.fn()
    const startWith = vi.fn()
    const register = vi.fn()
    const start = vi.fn()
    ctx.methods = {
      "pomodoro:register": register,
      "pomodoro:stop": stop,
      "pomodoro:start": start,
      "pomodoro:startWith": startWith,
      "pomodoro:pause": vi.fn(),
      "pomodoro:resume": vi.fn(),
    }
    pomodoroBackend.onMount?.(ctx)
    expect(stop).toHaveBeenCalledWith("btn1")
    expect(buttonScope.set).toHaveBeenCalledWith("state", {
      status: "idle",
      startTsMs: null,
      durationSec: 5,
      remainingSec: null,
    })
    expect(startWith).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
    expect(store.buttonScope).toHaveBeenCalledWith("pomodoro", "btn1")
  })

  it("preserves persisted state when config.durationSec matches", () => {
    const { ctx, buttonScope } = makeButtonCtx(1500, {
      status: "paused",
      startTsMs: Date.now() - 200_000,
      durationSec: 1500,
      remainingSec: 1296,
    })
    const stop = vi.fn()
    const startWith = vi.fn()
    ctx.methods = {
      "pomodoro:register": vi.fn(),
      "pomodoro:stop": stop,
      "pomodoro:startWith": startWith,
      "pomodoro:pause": vi.fn(),
    }
    pomodoroBackend.onMount?.(ctx)
    expect(stop).not.toHaveBeenCalled()
    expect(buttonScope.set).not.toHaveBeenCalled()
    expect(startWith).toHaveBeenCalledWith(
      "btn1",
      expect.any(Number),
      1500,
    )
  })
})

describe("pomodoro button onTap dispatch", () => {
  const makeTapCtx = (configDuration: number) => {
    const buttonScope: ButtonScopeMock = {
      get: vi.fn(() => undefined),
      set: vi.fn(),
    }
    const store = {
      buttonScope: vi.fn(() => buttonScope),
    }
    const notify = vi.fn()
    const ctx = {
      config: { durationSec: configDuration } as ConfigSchema,
      buttonId: "btn1",
      addonName: "pomodoro",
      methods: {} as Record<string, (...args: unknown[]) => unknown>,
      coreMethods: { notify } as never,
      publish: vi.fn(),
      executor: { run: vi.fn() },
      signal: new AbortController().signal,
      store,
    }
    return { ctx: ctx as never, store, buttonScope, notify }
  }

  const wireStateMethods = (
    ctx: ReturnType<typeof makeTapCtx>["ctx"],
    state: { isFinished: boolean; isPaused: boolean; hasEntry: boolean },
  ): {
    start: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    resume: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
  } => {
    const start = vi.fn()
    const pause = vi.fn()
    const resume = vi.fn()
    const stop = vi.fn()
    ctx.methods = {
      "pomodoro:isFinished": vi.fn(() => state.isFinished),
      "pomodoro:isPaused": vi.fn(() => state.isPaused),
      "pomodoro:hasEntry": vi.fn(() => state.hasEntry),
      "pomodoro:start": start,
      "pomodoro:pause": pause,
      "pomodoro:resume": resume,
      "pomodoro:stop": stop,
      "pomodoro:startWith": vi.fn(),
      "pomodoro:register": vi.fn(),
    }
    return { start, pause, resume, stop }
  }

  afterEach(() => {
    globalService.onUnload?.()
  })

  it("idle (no entry) → start fresh and schedule finish notification", () => {
    vi.useFakeTimers()
    const { ctx, buttonScope, notify } = makeTapCtx(5)
    const methods = wireStateMethods(ctx, {
      isFinished: false,
      isPaused: false,
      hasEntry: false,
    })
    pomodoroBackend.onTap?.(ctx)
    expect(methods.start).toHaveBeenCalledWith("btn1", 5)
    expect(buttonScope.set).toHaveBeenCalledWith("state", {
      status: "running",
      startTsMs: expect.any(Number),
      durationSec: 5,
      remainingSec: 5,
    })
    vi.advanceTimersByTime(5_000)
    expect(notify).toHaveBeenCalledWith({
      title: "Pomodoro",
      body: "Time's up!",
      sound: true,
    })
    vi.useRealTimers()
  })

  it("running → pause and cancel finish notification", () => {
    vi.useFakeTimers()
    const { ctx, buttonScope, notify } = makeTapCtx(5)
    const methods = wireStateMethods(ctx, {
      isFinished: false,
      isPaused: false,
      hasEntry: true,
    })
    // seed a running entry so paused-remaining math has something to read
    buttonScope.get = vi.fn(() => ({
      status: "running",
      startTsMs: Date.now() - 1000,
      durationSec: 5,
      remainingSec: null,
    }))
    pomodoroBackend.onTap?.(ctx)
    expect(methods.pause).toHaveBeenCalledWith("btn1")
    expect(buttonScope.set).toHaveBeenCalledWith(
      "state",
      expect.objectContaining({ status: "paused", durationSec: 5 }),
    )
    vi.advanceTimersByTime(10_000)
    expect(notify).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("paused → resume with residual finish notification", () => {
    vi.useFakeTimers()
    const { ctx, buttonScope, notify } = makeTapCtx(5)
    const methods = wireStateMethods(ctx, {
      isFinished: false,
      isPaused: true,
      hasEntry: true,
    })
    buttonScope.get = vi.fn(() => ({
      status: "paused",
      startTsMs: Date.now() - 2000,
      durationSec: 5,
      remainingSec: 3,
    }))
    pomodoroBackend.onTap?.(ctx)
    expect(methods.resume).toHaveBeenCalledWith("btn1")
    vi.advanceTimersByTime(3000)
    expect(notify).toHaveBeenCalledWith({
      title: "Pomodoro",
      body: "Time's up!",
      sound: true,
    })
    vi.useRealTimers()
  })

  it("finished (live isFinished=true) → restart fresh", () => {
    vi.useFakeTimers()
    const { ctx, buttonScope } = makeTapCtx(5)
    const methods = wireStateMethods(ctx, {
      isFinished: true,
      isPaused: false,
      hasEntry: true,
    })
    pomodoroBackend.onTap?.(ctx)
    expect(methods.start).toHaveBeenCalledWith("btn1", 5)
    expect(buttonScope.set).toHaveBeenCalledWith("state", {
      status: "running",
      startTsMs: expect.any(Number),
      durationSec: 5,
      remainingSec: 5,
    })
    vi.useRealTimers()
  })
})
