import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  introMock,
  logMock,
  outroMock,
  cancelMock,
  readPidMock,
  isRunningMock,
  readFlagsMock,
  readRuntimeStateMock,
  readChildrenMock,
  readConfigPathMock,
  listDevicesMock,
} = vi.hoisted(() => ({
  introMock: vi.fn(),
  logMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn() },
  outroMock: vi.fn(),
  cancelMock: vi.fn(),
  readPidMock: vi.fn(),
  isRunningMock: vi.fn(),
  readFlagsMock: vi.fn(),
  readRuntimeStateMock: vi.fn(),
  readChildrenMock: vi.fn(),
  readConfigPathMock: vi.fn(),
  listDevicesMock: vi.fn(),
}))

vi.mock("@/cli/prompt", () => ({
  intro: introMock,
  log: logMock,
  outro: outroMock,
  cancel: cancelMock,
}))

vi.mock("@/util/daemon", () => ({
  readPid: (...args: unknown[]) => readPidMock(...args),
  isRunning: (...args: unknown[]) => isRunningMock(...args),
  readFlags: (...args: unknown[]) => readFlagsMock(...args),
  readRuntimeState: (...args: unknown[]) => readRuntimeStateMock(...args),
  readChildren: (...args: unknown[]) => readChildrenMock(...args),
  readConfigPath: (...args: unknown[]) => readConfigPathMock(...args),
  resolveDaemonPaths: vi.fn(() => ({ pidFile: "/tmp/test.pid" })),
}))

vi.mock("@/device", () => ({
  listDevices: (...args: unknown[]) => listDevicesMock(...args),
}))

import { status } from "../status"

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as import("pino").Logger

beforeEach(() => {
  vi.clearAllMocks()
  readPidMock.mockReturnValue(null)
  isRunningMock.mockReturnValue(false)
  readFlagsMock.mockReturnValue(null)
  readRuntimeStateMock.mockReturnValue(null)
  readChildrenMock.mockReturnValue(null)
  readConfigPathMock.mockReturnValue(null)
  listDevicesMock.mockResolvedValue([])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("status", () => {
  it("reports not running when pid file is missing", async () => {
    readPidMock.mockReturnValue(null)
    await status({ logger: mockLogger })
    expect(introMock).toHaveBeenCalledWith("sirenodeck status")
    expect(logMock.error).toHaveBeenCalledWith("Daemon is not running")
    expect(cancelMock).toHaveBeenCalledWith(
      expect.stringContaining("No daemon"),
    )
  })

  it("reports stale pid file with no other artifacts", async () => {
    readPidMock.mockReturnValue(99999999)
    isRunningMock.mockReturnValue(false)
    await status({ logger: mockLogger })
    expect(introMock).toHaveBeenCalledWith("sirenodeck status")
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("stale pid file"),
    )
    expect(cancelMock).toHaveBeenCalledWith(
      expect.stringContaining("Stale pid file"),
    )
  })

  it("reports running emulator daemon with token hidden + url block + tip", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readFlagsMock.mockReturnValue({
      emulator: true,
      httpPort: 3939,
      remote: false,
    })
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "http://127.0.0.1:52938",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      lanHost: "127.0.0.1",
      addresses: [],
      emulatorMode: true,
      remote: false,
      startedAt: Date.now() - 60000,
      theme: "default",
    })
    readChildrenMock.mockReturnValue({ pids: [100, 200, 300] } as any)
    readConfigPathMock.mockReturnValue(
      "/home/test/.config/sirenodeck/config.yml",
    )

    await status({ logger: mockLogger })

    expect(introMock).toHaveBeenCalledWith("sirenodeck status")
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("running for"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Device :"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Emulator (mk2) (emulator mode)"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Remote:"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Config:"),
    )
    expect(logMock.info).toHaveBeenCalledWith(expect.stringContaining("Theme:"))
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Children:"),
    )
    // Frontend URL has NO token (default)
    expect(logMock.info).toHaveBeenCalledWith(
      "Frontend URL : http://127.0.0.1:5180",
    )
    expect(logMock.info).toHaveBeenCalledWith(
      "Bridge URL   : ws://127.0.0.1:52937",
    )
    expect(logMock.info).toHaveBeenCalledWith(
      "Config UI URL : http://127.0.0.1:52938",
    )
    // Token line is gone
    expect(logMock.info).not.toHaveBeenCalledWith(
      expect.stringContaining("Token:"),
    )
    expect(outroMock).toHaveBeenCalledWith("✓ Status snapshot")
  })

  it("never includes tokens in URLs", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readFlagsMock.mockReturnValue({
      emulator: true,
      httpPort: 3939,
      remote: false,
    })
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "http://127.0.0.1:52938",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      lanHost: "127.0.0.1",
      addresses: [],
      emulatorMode: true,
      remote: false,
      startedAt: Date.now() - 60000,
      theme: "default",
    })

    await status({ logger: mockLogger })

    expect(logMock.info).toHaveBeenCalledWith(
      "Frontend URL : http://127.0.0.1:5180",
    )
    expect(logMock.info).toHaveBeenCalledWith(
      "Config UI URL : http://127.0.0.1:52938",
    )
    expect(outroMock).toHaveBeenCalledWith("✓ Status snapshot")
  })

  it("renders hardware mode device from listDevices()", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readFlagsMock.mockReturnValue({ emulator: false, httpPort: 3939 })
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      lanHost: "127.0.0.1",
      addresses: [],
      emulatorMode: false,
      remote: false,
      startedAt: Date.now() - 1000,
      theme: "default",
    })
    listDevicesMock.mockResolvedValue([
      {
        id: "ABC123",
        model: "mk2",
        keyCount: 15,
        label: "MK.2 (ABC123)",
        transport: "real" as const,
      },
    ])

    await status({ logger: mockLogger })

    expect(listDevicesMock).toHaveBeenCalled()
    expect(logMock.info).toHaveBeenCalledWith(
      "Device :   MK.2 (ABC123) (hardware mode)",
    )
    // No emulator URL in hardware mode
    expect(logMock.info).not.toHaveBeenCalledWith(
      expect.stringContaining("Config UI URL"),
    )
  })

  it("falls back to em-dash when no device is enumerated in hardware mode", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readFlagsMock.mockReturnValue({ emulator: false, httpPort: 3939 })
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      lanHost: "127.0.0.1",
      addresses: [],
      emulatorMode: false,
      remote: false,
      startedAt: Date.now() - 1000,
      theme: "default",
    })
    listDevicesMock.mockResolvedValue([])

    await status({ logger: mockLogger })

    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringMatching(/Device :\s+— \(hardware mode\)/),
    )
  })

  it("renders hardware mode when listDevices() throws", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readFlagsMock.mockReturnValue({ emulator: false, httpPort: 3939 })
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      lanHost: "127.0.0.1",
      addresses: [],
      emulatorMode: false,
      remote: false,
      startedAt: Date.now() - 1000,
      theme: "default",
    })
    listDevicesMock.mockRejectedValue(new Error("hid: permission denied"))

    await status({ logger: mockLogger })

    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringMatching(/Device :\s+— \(hardware mode\)/),
    )
  })

  it("omits the tip when no token file is present", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readFlagsMock.mockReturnValue({ emulator: true, httpPort: 3939 })
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "http://127.0.0.1:52938",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      lanHost: "127.0.0.1",
      addresses: [],
      emulatorMode: true,
      remote: false,
      startedAt: Date.now() - 1000,
      theme: "default",
    })

    await status({ logger: mockLogger })

    expect(logMock.info).toHaveBeenCalledWith(
      "Frontend URL : http://127.0.0.1:5180",
    )
  })

  it("reports no children when children file is missing", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readChildrenMock.mockReturnValue(null)
    await status({ logger: mockLogger })
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("none tracked"),
    )
  })

  it("formats uptime correctly", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "http://127.0.0.1:52938",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      lanHost: "127.0.0.1",
      addresses: [],
      emulatorMode: true,
      remote: false,
      startedAt: Date.now() - 125000,
      theme: "dark",
    })
    await status({ logger: mockLogger })
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("running for"),
    )
    expect(logMock.info).toHaveBeenCalledWith(expect.stringContaining("Theme:"))
  })
})
