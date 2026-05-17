import { describe, expect, it, vi } from "vitest"

import { createSessionMonitor, type SessionMonitorClient } from "./session-monitor.js"

function createLinuxClientDouble(options: { active?: boolean; getActiveError?: Error } = {}): SessionMonitorClient & {
  bus: { disconnect: ReturnType<typeof vi.fn> }
  emitActiveChanged: (locked: boolean) => void
  sessionInterface: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> }
} {
  let activeChangedListener: ((locked: boolean) => void) | undefined
  const sessionInterface = {
    GetActive: vi.fn(async () => {
      if (options.getActiveError) {
        throw options.getActiveError
      }

      return options.active ?? false
    }),
    off: vi.fn((eventName: "ActiveChanged", listener: (locked: boolean) => void) => {
      if (eventName === "ActiveChanged" && activeChangedListener === listener) {
        activeChangedListener = undefined
      }
    }),
    on: vi.fn((eventName: "ActiveChanged", listener: (locked: boolean) => void) => {
      if (eventName === "ActiveChanged") {
        activeChangedListener = listener
      }
    }),
    removeListener: vi.fn(),
  }
  const proxyObject = {
    getInterface: vi.fn(() => sessionInterface),
  }
  const bus = {
    disconnect: vi.fn(),
    getProxyObject: vi.fn(async () => proxyObject),
  }

  return {
    bus,
    createLinuxBus: () => bus,
    emitActiveChanged: (locked: boolean) => {
      activeChangedListener?.(locked)
    },
    sessionInterface,
  }
}

describe("session monitor", () => {
  it("returns unsupported on non-linux platforms", async () => {
    const monitor = await createSessionMonitor({ platform: "darwin" })

    expect(monitor.getSnapshot()).toEqual({
      capability: "unsupported",
      state: "unknown",
    })
  })

  it("only reports supported on linux when the detector initializes", async () => {
    const client = createLinuxClientDouble({ active: false })
    const monitor = await createSessionMonitor({ client, platform: "linux" })
    const listener = vi.fn()
    const unsubscribe = monitor.subscribe(listener)

    expect(monitor.getSnapshot()).toEqual({
      capability: "supported",
      state: "unlocked",
    })

    client.emitActiveChanged(true)

    expect(monitor.getSnapshot()).toEqual({
      capability: "supported",
      state: "locked",
    })
    expect(listener).toHaveBeenCalledWith({
      capability: "supported",
      state: "locked",
    })

    unsubscribe()
    monitor.stop()

    expect(client.sessionInterface.off).toHaveBeenCalledWith("ActiveChanged", expect.any(Function))
    expect(client.bus.disconnect).toHaveBeenCalledTimes(1)
  })

  it("downgrades linux to unsupported when detector startup fails", async () => {
    const monitor = await createSessionMonitor({
      client: createLinuxClientDouble({ getActiveError: new Error("no session bus") }),
      platform: "linux",
    })

    expect(monitor.getSnapshot()).toEqual({
      capability: "unsupported",
      state: "unknown",
    })
  })
})
