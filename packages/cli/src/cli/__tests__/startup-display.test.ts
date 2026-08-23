import { createServer, type Server } from "node:net"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { introMock, outroMock, cancelMock, readRuntimeStateMock, logMock } =
  vi.hoisted(() => ({
    introMock: vi.fn(),
    outroMock: vi.fn(),
    cancelMock: vi.fn(),
    readRuntimeStateMock: vi.fn(),
    logMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn() },
  }))

vi.mock("@/cli/prompt", () => ({
  intro: introMock,
  outro: outroMock,
  cancel: cancelMock,
  log: logMock,
}))

vi.mock("@/util/daemon", () => ({
  readRuntimeState: (...args: unknown[]) => readRuntimeStateMock(...args),
}))

import {
  printAddonCheckResults,
  printDaemonEvents,
  printDaemonUrl,
  printRestartComplete,
  printRestartFailed,
  printStopComplete,
  waitForPortFree,
  waitForRuntimeState,
} from "../startup-display"

describe("waitForRuntimeState", () => {
  beforeEach(() => {
    readRuntimeStateMock.mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves null when runtime-state.json never appears", async () => {
    readRuntimeStateMock.mockReturnValue(null)
    const result = await waitForRuntimeState(200)
    expect(result).toBe(null)
  })

  it("returns state when file appears quickly", async () => {
    const state = {
      emulatorUrl: "http://127.0.0.1:52938",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      token: "abc123",
      lanHost: "192.168.1.10",
      addresses: ["192.168.1.10"],
      emulatorMode: true,
      remote: false,
    }
    readRuntimeStateMock.mockReturnValue(state)
    const result = await waitForRuntimeState(2_000)
    expect(result).not.toBeNull()
    expect(result!.emulatorUrl).toBe("http://127.0.0.1:52938")
    expect(result!.token).toBe("abc123")
  })
})

describe("waitForPortFree", () => {
  afterEach(async () => {
    vi.restoreAllMocks()
  })

  it("resolves true immediately when no process is bound", async () => {
    const result = await waitForPortFree(49199, 500)
    expect(result).toBe(true)
  })

  it("resolves true after a bound server is closed", async () => {
    const srv: Server = createServer()
    await new Promise<void>((resolve) => srv.listen(49198, resolve))
    const promise = waitForPortFree(49198, 1_000)
    srv.close()
    const result = await promise
    expect(result).toBe(true)
  })

  it("resolves false when port stays bound", async () => {
    const srv: Server = createServer()
    await new Promise<void>((resolve) => srv.listen(49197, resolve))
    const result = await waitForPortFree(49197, 300)
    expect(result).toBe(false)
    srv.close()
  })
})

describe("printDaemonEvents", () => {
  beforeEach(() => {
    logMock.info.mockClear()
    logMock.warn.mockClear()
    logMock.error.mockClear()
  })

  it("writes nothing when events array is empty", () => {
    printDaemonEvents([])
    expect(logMock.info).not.toHaveBeenCalled()
    expect(logMock.warn).not.toHaveBeenCalled()
    expect(logMock.error).not.toHaveBeenCalled()
  })

  it("writes one line per event via log.*", () => {
    printDaemonEvents([
      { level: "warn", component: "http", message: "disk full", time: 1 },
      { level: "error", component: "", message: "crash", time: 2 },
    ])
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("disk full"),
    )
    expect(logMock.error).toHaveBeenCalledWith(expect.stringContaining("crash"))
  })

  it("includes component bracket when non-empty", () => {
    printDaemonEvents([
      { level: "fatal", component: "ws", message: "boom", time: 1 },
    ])
    expect(logMock.error).toHaveBeenCalledWith(expect.stringContaining("[ws]"))
    expect(logMock.error).toHaveBeenCalledWith(expect.stringContaining("boom"))
  })
})

describe("printDaemonUrl", () => {
  const makeState = (overrides = {}): Parameters<typeof printDaemonUrl>[0] => ({
    emulatorUrl: "http://127.0.0.1:52938",
    wsUrl: "ws://127.0.0.1:52937",
    frontendUrl: "http://127.0.0.1:5180",
    token: "tok123",
    lanHost: "192.168.1.10",
    addresses: [] as string[],
    emulatorMode: true,
    remote: false,
    startedAt: 1,
    theme: undefined,
    ...overrides,
  })

  it("prints the local URL", async () => {
    const output = vi.fn()
    await printDaemonUrl(makeState(), output)
    const text = output.mock.calls.map((c: string[]) => c[0]!).join("")
    expect(text).toContain("127.0.0.1")
    expect(text).toContain("token=tok123")
  })

  it("includes LAN lines when addresses present", async () => {
    const output = vi.fn()
    // Force non-TTY so we get plain URL output
    const original = process.stdout.isTTY
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    })
    await printDaemonUrl(
      makeState({ remote: true, addresses: ["192.168.1.10"] }),
      output,
    )
    Object.defineProperty(process.stdout, "isTTY", {
      value: original,
      configurable: true,
    })
    const text = output.mock.calls.map((c: string[]) => c[0]!).join("")
    expect(text).toContain("192.168.1.10")
  })

  it("omits LAN section when remote is false (emulator mode)", async () => {
    const output = vi.fn()
    const original = process.stdout.isTTY
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    })
    await printDaemonUrl(
      makeState({ remote: false, addresses: ["192.168.1.10"] }),
      output,
    )
    Object.defineProperty(process.stdout, "isTTY", {
      value: original,
      configurable: true,
    })
    const text = output.mock.calls.map((c: string[]) => c[0]!).join("")
    expect(text).not.toContain("192.168.1.10")
    expect(text).not.toContain("Emulator (LAN)")
  })

  it("includes LAN URL when remote is true (non-TTY format)", async () => {
    const output = vi.fn()
    const original = process.stdout.isTTY
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    })
    await printDaemonUrl(
      makeState({ remote: true, addresses: ["192.168.1.10"] }),
      output,
    )
    Object.defineProperty(process.stdout, "isTTY", {
      value: original,
      configurable: true,
    })
    const text = output.mock.calls.map((c: string[]) => c[0]!).join("")
    expect(text).toContain("192.168.1.10")
  })
})

describe("printStopComplete", () => {
  const originalIsTTY = process.stdout.isTTY
  beforeEach(() => {
    introMock.mockClear()
    outroMock.mockClear()
    cancelMock.mockClear()
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
  })
  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    })
  })

  it("calls outro on clean stop (port free)", () => {
    printStopComplete(true)
    expect(outroMock).toHaveBeenCalledWith("✓ Sireno Deck stopped")
  })

  it("calls cancel when port still bound", () => {
    printStopComplete(false)
    expect(cancelMock).toHaveBeenCalledWith(
      expect.stringContaining("port 52937 is still bound"),
    )
  })
})

describe("printRestartComplete / printRestartFailed", () => {
  const originalIsTTY = process.stdout.isTTY
  beforeEach(() => {
    outroMock.mockClear()
    cancelMock.mockClear()
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
  })
  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    })
  })

  it("printRestartComplete calls outro", () => {
    printRestartComplete()
    expect(outroMock).toHaveBeenCalledWith("✓ Sireno Deck restarted")
  })

  it("printRestartFailed calls cancel with error message", () => {
    printRestartFailed(new Error("timeout"))
    expect(cancelMock).toHaveBeenCalledWith(expect.stringContaining("timeout"))
  })
})

describe("printAddonCheckResults", () => {
  beforeEach(() => {
    logMock.info.mockClear()
    logMock.warn.mockClear()
  })

  it("writes nothing when outcomes array is empty", () => {
    printAddonCheckResults([])
    expect(logMock.info).not.toHaveBeenCalled()
    expect(logMock.warn).not.toHaveBeenCalled()
  })

  it("logs available checks via log.info", () => {
    printAddonCheckResults([
      { addonName: "media", checkName: "playerctl", available: true },
    ])
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("media/playerctl"),
    )
  })

  it("logs failing checks via log.warn with reason", () => {
    printAddonCheckResults([
      {
        addonName: "media",
        checkName: "playerctl",
        available: false,
        reason: "install playerctl",
      },
    ])
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("media/playerctl"),
    )
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("install playerctl"),
    )
  })

  it("logs each outcome independently", () => {
    printAddonCheckResults([
      { addonName: "media", checkName: "playerctl", available: true },
      {
        addonName: "media",
        checkName: "wpctl",
        available: false,
        reason: "missing",
      },
    ])
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("media/playerctl"),
    )
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("media/wpctl"),
    )
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("missing"),
    )
  })
})
