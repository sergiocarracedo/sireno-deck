import { createServer, type Server } from "node:net"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { introMock, outroMock, cancelMock, readRuntimeStateMock } = vi.hoisted(
  () => ({
    introMock: vi.fn(),
    outroMock: vi.fn(),
    cancelMock: vi.fn(),
    readRuntimeStateMock: vi.fn(),
  }),
)

vi.mock("@/cli/prompt", () => ({
  intro: introMock,
  outro: outroMock,
  cancel: cancelMock,
}))

vi.mock("@/util/daemon", () => ({
  readRuntimeState: (...args: unknown[]) => readRuntimeStateMock(...args),
}))

import {
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
  it("writes nothing when events array is empty", () => {
    const output = vi.fn()
    printDaemonEvents([], output)
    expect(output).not.toHaveBeenCalled()
  })

  it("writes one line per event", () => {
    const output = vi.fn()
    printDaemonEvents(
      [
        { level: "warn", component: "http", message: "disk full", time: 1 },
        { level: "error", component: "", message: "crash", time: 2 },
      ],
      output,
    )
    expect(output).toHaveBeenCalledTimes(2)
    expect(output.mock.calls[0][0]).toContain("disk full")
    expect(output.mock.calls[1][0]).toContain("crash")
  })

  it("includes component bracket when non-empty", () => {
    const output = vi.fn()
    printDaemonEvents(
      [{ level: "fatal", component: "ws", message: "boom", time: 1 }],
      output,
    )
    // ponytail: strip ANSI to check raw text content
    const text = output.mock.calls[0][0].replace(/\x1b\[[0-9;]*m/g, "")
    expect(text).toContain("[ws]")
  })
})

describe("printDaemonUrl", () => {
  const makeState = (overrides = {}) => ({
    emulatorUrl: "http://127.0.0.1:52938",
    wsUrl: "ws://127.0.0.1:52937",
    frontendUrl: "http://127.0.0.1:5180",
    token: "tok123",
    lanHost: "192.168.1.10",
    addresses: [] as string[],
    emulatorMode: true,
    remote: false,
    ...overrides,
  })

  it("prints the local URL", () => {
    const output = vi.fn()
    printDaemonUrl(makeState(), output)
    const text = output.mock.calls.map((c: [string]) => c[0]).join("")
    expect(text).toContain("127.0.0.1")
    expect(text).toContain("token=tok123")
  })

  it("includes LAN lines when addresses present", () => {
    const output = vi.fn()
    // Force non-TTY so we get plain URL output
    const original = process.stdout.isTTY
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    })
    printDaemonUrl(makeState({ addresses: ["192.168.1.10"] }), output)
    Object.defineProperty(process.stdout, "isTTY", {
      value: original,
      configurable: true,
    })
    const text = output.mock.calls.map((c: [string]) => c[0]).join("")
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
