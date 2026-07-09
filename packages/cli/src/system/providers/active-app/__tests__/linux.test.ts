import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type pino from "pino"

import { createLinuxActiveAppProvider } from "../linux"
import {
  type CommandExecutor,
  type LinuxDbusBus,
  type LinuxDbusInterface,
  type LinuxDbusProxyObject,
} from "@/system/providers/shared"

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

const makeExecutor = (
  handler: (
    cmd: string,
    args: string[],
  ) => {
    exitCode: number
    stdout: string
    stderr: string
  },
): CommandExecutor => ({
  async run(cmd, args) {
    return handler(cmd, [...args])
  },
})

const dbusStub = (): {
  bus: LinuxDbusBus
  evalMock: ReturnType<typeof vi.fn>
} => {
  const evalMock = vi.fn(async () =>
    JSON.stringify({ wm_class: "Google Chrome", title: "GitHub", pid: 1234 }),
  )
  const iface: LinuxDbusInterface = {
    Eval: evalMock,
  }
  const proxy: LinuxDbusProxyObject = {
    getInterface: () => iface,
  }
  const bus: LinuxDbusBus = {
    getProxyObject: async () => proxy,
  }
  return { bus, evalMock }
}

describe("createLinuxActiveAppProvider", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("returns parsed snapshot from D-Bus Eval", async () => {
    const { bus, evalMock } = dbusStub()
    const executor = makeExecutor(() => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
    }))
    const provider = await createLinuxActiveAppProvider({
      dbus: bus,
      executor,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    const snap = await provider.getActive()
    expect(snap).toEqual({
      name: "Google Chrome",
      windowTitle: "GitHub",
      processId: 1234,
    })
    expect(evalMock).toHaveBeenCalled()
    await provider.stop()
  })

  it("falls back to /proc when D-Bus throws", async () => {
    const bus: LinuxDbusBus = {
      async getProxyObject() {
        throw new Error("no D-Bus")
      },
    }
    const executor = makeExecutor((cmd, args) => {
      if (
        cmd === "sh" &&
        args[0] === "-c" &&
        args[1]?.startsWith("xdotool getactivewindow")
      ) {
        return { exitCode: 0, stdout: "0x1234", stderr: "" }
      }
      if (
        cmd === "sh" &&
        args[0] === "-c" &&
        args[1]?.startsWith("xdotool getwindowpid")
      ) {
        return { exitCode: 0, stdout: "7777", stderr: "" }
      }
      if (
        cmd === "sh" &&
        args[0] === "-c" &&
        args[1]?.startsWith("cat /proc/")
      ) {
        return { exitCode: 0, stdout: "firefox\n", stderr: "" }
      }
      return { exitCode: 1, stdout: "", stderr: "" }
    })
    const provider = await createLinuxActiveAppProvider({
      dbus: bus,
      executor,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    const snap = await provider.getActive()
    expect(snap).toEqual({
      name: "firefox",
      windowTitle: null,
      processId: 7777,
    })
    await provider.stop()
  })

  it("returns null provider when no dbus and no executor (returns null on snapshot)", async () => {
    const provider = await createLinuxActiveAppProvider({
      executor: makeExecutor(() => ({ exitCode: 1, stdout: "", stderr: "" })),
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    const snap = await provider.getActive()
    expect(snap).toBeNull()
    await provider.stop()
  })

  it("subscriber fires on snapshot change", async () => {
    let callCount = 0
    const iface: LinuxDbusInterface = {
      async Eval() {
        callCount += 1
        if (callCount === 1) {
          return JSON.stringify({ wm_class: "Alpha", title: "t1", pid: 1 })
        }
        return JSON.stringify({ wm_class: "Beta", title: "t2", pid: 2 })
      },
    }
    const bus: LinuxDbusBus = {
      async getProxyObject() {
        return { getInterface: () => iface }
      },
    }
    const executor = makeExecutor(() => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
    }))
    const handler = vi.fn()
    const provider = await createLinuxActiveAppProvider({
      dbus: bus,
      executor,
      logger: silentLogger(),
      pollIntervalMs: 50,
    })
    provider.subscribe(handler)
    await vi.advanceTimersByTimeAsync(250)
    expect(handler).toHaveBeenCalled()
    expect(handler.mock.calls.length).toBeGreaterThanOrEqual(2)
    await provider.stop()
  })

  it("stop() clears interval and disconnects bus", async () => {
    const disconnect = vi.fn()
    const bus: LinuxDbusBus = {
      async getProxyObject() {
        return {
          getInterface: () => ({ Eval: async () => JSON.stringify({}) }),
        }
      },
      disconnect,
    }
    const executor = makeExecutor(() => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
    }))
    const provider = await createLinuxActiveAppProvider({
      dbus: bus,
      executor,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    await provider.stop()
    expect(disconnect).toHaveBeenCalled()
  })
})
