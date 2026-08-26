import { afterEach, describe, expect, it, vi } from "vitest"

import pomodoroBackend from "../buttons/pomodoro/backend"
import type { ConfigSchema } from "../buttons/pomodoro/config"
import { globalService } from "../global/backend"
import { POMO_CHANNEL } from "../shared/state"

const makeCtx = () => {
  return {
    ctx: {
      publish: vi.fn(),
      poll: vi.fn(),
      signal: new AbortController().signal,
      executor: { run: vi.fn() },
      notify: vi.fn(async () => {}),
    },
  }
}

describe("pomodoro globalService", () => {
  afterEach(() => {
    globalService.onUnload?.()
  })

  it("registers a channel and an interval", () => {
    expect(globalService.pollers?.[0]?.channel).toBe(POMO_CHANNEL)
    expect(globalService.pollers?.[0]?.intervalMs).toBe(1000)
  })

  it("poll returns a paused-at-full snapshot right after register", () => {
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    globalService.methods?.["register"]?.("btn1", 60)
    const poll = globalService.pollers?.[0]
    const snapshot = poll?.poll() as Record<string, unknown>
    // ponytail: mount state is PAUSED at the full configured duration —
    // the tile shows the time and waits for a tap; never auto-starts.
    expect(snapshot["btn1"]).toEqual({
      status: "paused",
      remainingSec: 60,
      totalSec: 60,
    })
  })

  it("start/stop methods track button state", () => {
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    globalService.methods?.["start"]?.("btn1", 60)
    globalService.methods?.["stop"]?.("btn1")
  })

  it("start after pause clears pausedRemainingSec so the snapshot reports running", () => {
    // ponytail: without this, a tap after a pause would re-emit the
    // paused-at-full snapshot — the frontend looked stuck for a poller
    // tick before finally showing running remaining. The fix: start()
    // drops the paused marker so rebuildSnapshot takes the running
    // branch immediately on the very next publishNow().
    const { ctx } = makeCtx()
    globalService.onLoad?.(ctx as never)
    globalService.methods?.["register"]?.("btn1", 60)
    globalService.methods?.["pause"]?.("btn1") // sets pausedRemainingSec
    globalService.methods?.["start"]?.("btn1", 60)
    const snapshot = (
      globalService.pollers?.[0]?.poll() as Record<string, unknown>
    )["btn1"] as Record<string, unknown>
    expect(snapshot).toEqual({
      status: "running",
      remainingSec: 60,
      totalSec: 60,
    })
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

interface ButtonScopeMock {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
}

const makeButtonCtx = (
  configDuration: number,
  persistedState: unknown,
  configExtra: Record<string, unknown> = {},
) => {
  const buttonScope: ButtonScopeMock = {
    get: vi.fn((_key: string) => persistedState),
    set: vi.fn(),
  }
  const store = {
    buttonScope: vi.fn(() => buttonScope),
  }
  const ctx = {
    config: { durationSec: configDuration, ...configExtra } as ConfigSchema,
    buttonId: "btn1",
    addonName: "pomodoro",
    methods: {} as Record<string, (...args: unknown[]) => unknown>,
    coreMethods: {} as never,
    publish: vi.fn(),
    executor: { run: vi.fn() },
    signal: new AbortController().signal,
    store,
  }
  return {
    ctx: ctx as unknown as Parameters<typeof pomodoroBackend.onMount>[0],
    store,
    buttonScope,
  }
}

const wireMountMethods = (ctx: unknown) => {
  const register = vi.fn()
  const stop = vi.fn()
  const start = vi.fn()
  const startWith = vi.fn()
  const pause = vi.fn()
  const resume = vi.fn()
  ;(
    ctx as unknown as {
      methods: Record<string, (...args: unknown[]) => unknown>
    }
  ).methods = {
    "pomodoro:register": register,
    "pomodoro:stop": stop,
    "pomodoro:start": start,
    "pomodoro:startWith": startWith,
    "pomodoro:pause": pause,
    "pomodoro:resume": resume,
  }
  return { register, stop, start, startWith, pause, resume }
}

describe("pomodoro button onMount state matrix", () => {
  it("idle persisted → paused-at-full presentation, persisted untouched", () => {
    const persisted = {
      status: "idle",
      startTsMs: null,
      durationSec: 1500,
      remainingSec: null,
    }
    const { ctx, buttonScope } = makeButtonCtx(1500, persisted)
    const m = wireMountMethods(ctx)
    pomodoroBackend.onMount?.(ctx)
    expect(m.register).toHaveBeenCalledWith("btn1", 1500, undefined)
    expect(m.startWith).not.toHaveBeenCalled()
    expect(m.start).not.toHaveBeenCalled()
    expect(m.pause).not.toHaveBeenCalled()
    // already idle — nothing to normalize
    expect(buttonScope.set).not.toHaveBeenCalled()
  })

  it("finished persisted → silent reset to idle, no notification", () => {
    const { ctx, buttonScope } = makeButtonCtx(1500, {
      status: "finished",
      startTsMs: Date.now() - 999_999,
      durationSec: 1500,
      remainingSec: 0,
    })
    const m = wireMountMethods(ctx)
    pomodoroBackend.onMount?.(ctx)
    // global stays paused-at-full from register(); persisted normalizes
    expect(buttonScope.set).toHaveBeenCalledWith("state", {
      status: "idle",
      startTsMs: null,
      durationSec: 1500,
      remainingSec: null,
    })
    expect(m.startWith).not.toHaveBeenCalled()
    expect(m.start).not.toHaveBeenCalled()
  })

  it("running expired offline → silent reset to idle, no startWith", () => {
    const { ctx, buttonScope } = makeButtonCtx(1500, {
      status: "running",
      // ~33 min ago — well past the 1500 s duration
      startTsMs: Date.now() - 2_000_000,
      durationSec: 1500,
      remainingSec: null,
    })
    const m = wireMountMethods(ctx)
    pomodoroBackend.onMount?.(ctx)
    expect(buttonScope.set).toHaveBeenCalledWith("state", {
      status: "idle",
      startTsMs: null,
      durationSec: 1500,
      remainingSec: null,
    })
    expect(m.startWith).not.toHaveBeenCalled()
  })

  it("running mid-countdown → resumes via startWith", () => {
    const startTsMs = Date.now() - 2_000
    const { ctx, buttonScope } = makeButtonCtx(1500, {
      status: "running",
      startTsMs,
      durationSec: 1500,
      remainingSec: null,
    })
    const m = wireMountMethods(ctx)
    pomodoroBackend.onMount?.(ctx)
    expect(m.startWith).toHaveBeenCalledWith("btn1", startTsMs, 1500, undefined)
    expect(buttonScope.set).not.toHaveBeenCalled()
  })

  it("paused with remaining → restores paused at remaining", () => {
    const { ctx } = makeButtonCtx(1500, {
      status: "paused",
      startTsMs: Date.now() - 200_000,
      durationSec: 1500,
      remainingSec: 1296,
    })
    const m = wireMountMethods(ctx)
    pomodoroBackend.onMount?.(ctx)
    expect(m.pause).toHaveBeenCalledWith("btn1")
    const call = m.startWith.mock.calls[0]?.[1] as number
    // startTsMs reconstructed so that remaining == 1296
    expect(Math.round((Date.now() - call) / 1000)).toBe(1500 - 1296)
  })

  it("forwards config.notification through register", () => {
    const notification = { title: "T", body: "B" }
    const { ctx } = makeButtonCtx(
      1500,
      {
        status: "idle",
        startTsMs: null,
        durationSec: 1500,
        remainingSec: null,
      },
      { notification },
    )
    const m = wireMountMethods(ctx)
    pomodoroBackend.onMount?.(ctx)
    expect(m.register).toHaveBeenCalledWith("btn1", 1500, notification)
  })
})

// ponytail: shared between onTap and onDblTap describes. Hoisted to module
// scope so sibling describe blocks can use it without re-declaration.
const makeTapCtx = (configDuration: number) => {
  const buttonScope: ButtonScopeMock = {
    get: vi.fn(() => undefined),
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

describe("pomodoro button onTap dispatch", () => {
  const makeTapCtx = (configDuration: number) => {
    const buttonScope: ButtonScopeMock = {
      get: vi.fn(() => undefined),
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

  const wireTapMethods = (ctx: unknown) => {
    const start = vi.fn()
    const pause = vi.fn()
    const resume = vi.fn()
    const stop = vi.fn()
    const startWith = vi.fn()
    const register = vi.fn()
    ;(
      ctx as unknown as {
        methods: Record<string, (...args: unknown[]) => unknown>
      }
    ).methods = {
      "pomodoro:start": start,
      "pomodoro:pause": pause,
      "pomodoro:resume": resume,
      "pomodoro:stop": stop,
      "pomodoro:startWith": startWith,
      "pomodoro:register": register,
    }
    return { start, pause, resume, stop, startWith, register }
  }

  it("idle (no entry) → start fresh", () => {
    const { ctx, buttonScope } = makeTapCtx(5)
    const m = wireTapMethods(ctx)
    pomodoroBackend.onTap?.(ctx)
    expect(m.start.mock.calls[0]?.slice(0, 2)).toEqual(["btn1", 5])
    expect(buttonScope.set).toHaveBeenCalledWith("state", {
      status: "running",
      startTsMs: expect.any(Number),
      durationSec: 5,
      remainingSec: 5,
    })
  })

  it("running → pause with computed remaining", () => {
    const { ctx, buttonScope } = makeTapCtx(5)
    buttonScope.get = vi.fn(() => ({
      status: "running",
      startTsMs: Date.now() - 1000,
      durationSec: 5,
      remainingSec: null,
    }))
    const m = wireTapMethods(ctx)
    pomodoroBackend.onTap?.(ctx)
    expect(m.pause).toHaveBeenCalledWith("btn1")
    expect(buttonScope.set).toHaveBeenCalledWith(
      "state",
      expect.objectContaining({ status: "paused", durationSec: 5 }),
    )
  })

  it("paused with remaining → resume", () => {
    const { ctx, buttonScope } = makeTapCtx(5)
    const persisted = {
      status: "paused",
      startTsMs: Date.now() - 2000,
      durationSec: 5,
      remainingSec: 3,
    }
    // wire the persisted state into the store mock
    ;(buttonScope.get as ReturnType<typeof vi.fn>).mockImplementation(
      () => persisted,
    )
    const m = wireTapMethods(ctx)
    pomodoroBackend.onTap?.(ctx)
    expect(m.resume).toHaveBeenCalledWith("btn1")
  })

  it("finished persisted → tap returns to initial paused-at-full state", () => {
    const { ctx, buttonScope } = makeTapCtx(5)
    buttonScope.get = vi.fn(() => ({
      status: "finished",
      startTsMs: Date.now() - 999_999,
      durationSec: 5,
      remainingSec: 0,
    }))
    const m = wireTapMethods(ctx)
    pomodoroBackend.onTap?.(ctx)
    // reset path: persisted → idle; global re-seeds paused-at-full.
    // User must tap AGAIN to actually start a fresh countdown.
    expect(buttonScope.set).toHaveBeenCalledWith("state", {
      status: "idle",
      startTsMs: null,
      durationSec: 5,
      remainingSec: null,
    })
    expect(m.register).toHaveBeenCalledWith("btn1", 5, undefined)
    expect(m.start).not.toHaveBeenCalled()
    expect(m.startWith).not.toHaveBeenCalled()
  })
})

const wireDblTapMethods = (ctx: unknown) => {
  const start = vi.fn()
  const pause = vi.fn()
  const resume = vi.fn()
  const stop = vi.fn()
  const startWith = vi.fn()
  const register = vi.fn()
  ;(
    ctx as unknown as {
      methods: Record<string, (...args: unknown[]) => unknown>
    }
  ).methods = {
    "pomodoro:start": start,
    "pomodoro:pause": pause,
    "pomodoro:resume": resume,
    "pomodoro:stop": stop,
    "pomodoro:startWith": startWith,
    "pomodoro:register": register,
  }
  return { start, pause, resume, stop, startWith, register }
}

describe("pomodoro button onDblTap dispatch", () => {
  it("finished → returns to initial state AND starts a fresh countdown", () => {
    const { ctx, buttonScope } = makeTapCtx(5)
    buttonScope.get = vi.fn(() => ({
      status: "finished",
      startTsMs: Date.now() - 999_999,
      durationSec: 5,
      remainingSec: 0,
    }))
    const m = wireDblTapMethods(ctx)
    pomodoroBackend.onDblTap?.(ctx)
    expect(buttonScope.set).toHaveBeenCalledWith("state", {
      status: "running",
      startTsMs: expect.any(Number),
      durationSec: 5,
      remainingSec: 5,
    })
    expect(m.start.mock.calls[0]?.slice(0, 2)).toEqual(["btn1", 5])
  })

  it("non-finished states are no-ops", () => {
    for (const status of ["idle", "running", "paused"] as const) {
      const { ctx, buttonScope } = makeTapCtx(5)
      buttonScope.get = vi.fn(() => ({
        status,
        startTsMs: Date.now(),
        durationSec: 5,
        remainingSec: status === "paused" ? 3 : null,
      }))
      const m = wireDblTapMethods(ctx)
      pomodoroBackend.onDblTap?.(ctx)
      expect(m.start).not.toHaveBeenCalled()
      expect(m.startWith).not.toHaveBeenCalled()
      expect(m.pause).not.toHaveBeenCalled()
      expect(m.resume).not.toHaveBeenCalled()
      expect(buttonScope.set).not.toHaveBeenCalled()
    }
  })
})
