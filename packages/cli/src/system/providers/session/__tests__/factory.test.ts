import { describe, expect, it, vi } from "vitest"

import type pino from "pino"

import { createSessionProvider } from "@/system/providers/session"
import type { SessionProvider } from "@/system/providers/session"

const silentLogger = (): pino.Logger => {
  const noop = (): void => undefined
  return {
    info: vi.fn(noop),
    warn: vi.fn(noop),
    error: vi.fn(noop),
    debug: vi.fn(noop),
    trace: vi.fn(noop),
    fatal: vi.fn(noop),
    child: vi.fn(),
    level: "silent",
  } as unknown as pino.Logger
}

const stubs = vi.hoisted(() => {
  const real: SessionProvider = {
    getState: () => "unlocked",
    subscribe: () => () => undefined,
    stop: async () => undefined,
  }
  return { real }
})

vi.mock("@/system/providers/session/linux", () => ({
  createLinuxSessionProvider: vi.fn(async () => stubs.real),
}))

vi.mock("@/system/providers/session/darwin", () => ({
  createDarwinSessionProvider: vi.fn(async () => stubs.real),
}))

vi.mock("@/system/providers/session/windows", () => ({
  createWindowsSessionProvider: vi.fn(async () => stubs.real),
}))

describe("createSessionProvider factory", () => {
  it("delegates to linux provider when dbus is not injected", async () => {
    const provider = await createSessionProvider({
      platform: "linux",
      logger: silentLogger(),
    })
    expect(provider.getState()).toBe("unlocked")
  })

  it("delegates to darwin provider when executor is injected", async () => {
    const provider = await createSessionProvider({
      platform: "darwin",
      executor: { run: vi.fn() },
      logger: silentLogger(),
    })
    expect(provider.getState()).toBe("unlocked")
  })

  it("delegates to windows provider when executor is injected", async () => {
    const provider = await createSessionProvider({
      platform: "win32",
      executor: { run: vi.fn() },
      logger: silentLogger(),
    })
    expect(provider.getState()).toBe("unlocked")
  })

  it("returns null provider on darwin when executor is missing", async () => {
    const provider = await createSessionProvider({
      platform: "darwin",
      logger: silentLogger(),
    })
    expect(provider.getState()).toBe("unknown")
  })

  it("returns null provider on win32 when executor is missing", async () => {
    const provider = await createSessionProvider({
      platform: "win32",
      logger: silentLogger(),
    })
    expect(provider.getState()).toBe("unknown")
  })
})
