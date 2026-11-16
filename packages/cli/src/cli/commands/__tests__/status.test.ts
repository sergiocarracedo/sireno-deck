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
  requestTokenMock,
  requestHealthMock,
  probeHttpMock,
  probeBridgeMock,
  probeIdentityMock,
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
  requestTokenMock: vi.fn(),
  requestHealthMock: vi.fn(),
  probeHttpMock: vi.fn(),
  probeBridgeMock: vi.fn(),
  probeIdentityMock: vi.fn(),
}))

vi.mock("@/util/daemon-control", () => ({
  requestDaemonToken: requestTokenMock,
  requestDaemonHealth: requestHealthMock,
}))
vi.mock("../status-probes", () => ({
  probeHttp: probeHttpMock,
  probeBridgeInfo: probeBridgeMock,
  probeWebIdentity: probeIdentityMock,
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
  requestTokenMock.mockResolvedValue("secret")
  requestHealthMock.mockResolvedValue(null)
  probeHttpMock.mockResolvedValue("responding")
  probeBridgeMock.mockResolvedValue({ status: "responding", identity: null })
  probeIdentityMock.mockResolvedValue(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("status", () => {
  it("uses colors for status values when explicitly enabled", async () => {
    vi.stubEnv("NO_COLOR", undefined)
    vi.stubEnv("FORCE_COLOR", "1")
    readPidMock.mockReturnValue(process.pid)
    isRunningMock.mockReturnValue(true)
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "",
      wsUrl: "ws://127.0.0.1:1",
      frontendUrl: "http://127.0.0.1:2",
      emulatorMode: false,
      remote: false,
      startedAt: Date.now(),
    })
    probeHttpMock.mockResolvedValue("unreachable")
    await status({ logger: mockLogger })
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("\u001b[31munreachable\u001b[39m"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("\u001b[33munknown\u001b[39m"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("\u001b[32mresponding\u001b[39m"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Mode: \u001b[97mhardware\u001b[39m"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("URL: \u001b[97mhttp://127.0.0.1:2\u001b[39m"),
    )
  })

  it("does not emit color codes when NO_COLOR is set", async () => {
    vi.stubEnv("NO_COLOR", "1")
    vi.stubEnv("FORCE_COLOR", "1")
    readPidMock.mockReturnValue(process.pid)
    isRunningMock.mockReturnValue(true)
    await status({ logger: mockLogger })
    expect(logMock.info.mock.calls.flat().join("\n")).not.toContain("\u001b[")
  })

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
      expect.stringContaining("Daemon: running"),
    )
    expect(logMock.info).toHaveBeenCalledWith(expect.stringContaining("Device"))
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Model: mk2"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Remote: off"),
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
      expect.stringContaining("URL: http://127.0.0.1:5180"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("URL: ws://127.0.0.1:52937"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("URL: http://127.0.0.1:52938"),
    )
    // Token line is gone
    expect(logMock.info).not.toHaveBeenCalledWith(
      expect.stringContaining("Token:"),
    )
    expect(outroMock).toHaveBeenCalledWith("✓ Status snapshot")
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Bridge: responding"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Core: unknown"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      "Renderer: not applicable (emulator mode)",
    )
  })

  it("reports an unreachable frontend without claiming the runtime is healthy", async () => {
    readPidMock.mockReturnValue(process.pid)
    isRunningMock.mockReturnValue(true)
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "",
      wsUrl: "ws://127.0.0.1:1",
      frontendUrl: "http://127.0.0.1:2",
      emulatorMode: false,
      remote: false,
      startedAt: Date.now(),
    })
    probeHttpMock.mockResolvedValue("unreachable")
    await status({ logger: mockLogger })
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Frontend: unreachable"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Renderer: unknown"),
    )
  })

  it("reports live renderer health and mismatched component builds", async () => {
    readPidMock.mockReturnValue(process.pid)
    isRunningMock.mockReturnValue(true)
    readRuntimeStateMock.mockReturnValue({
      configUiUrl: "http://127.0.0.1:3",
      wsUrl: "ws://127.0.0.1:1",
      frontendUrl: "http://127.0.0.1:2",
      emulatorMode: false,
      remote: false,
      startedAt: Date.now(),
    })
    requestHealthMock.mockResolvedValue({
      identity: { version: "0.3.0-dev", buildId: "aaa" },
      core: "ready",
      renderer: { state: "healthy", lastFrameAt: Date.now() },
    })
    probeIdentityMock
      .mockResolvedValueOnce({ version: "0.3.0-dev", buildId: "bbb" })
      .mockResolvedValueOnce({ version: "0.3.0-dev", buildId: "aaa" })
    await status({ logger: mockLogger })
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Core: ready"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Renderer: healthy"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringMatching(
        /Frontend: responding[\s\S]*├─ URL: http:\/\/127\.0\.0\.1:2[\s\S]*└─ Version: 0\.3\.0-dev/,
      ),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Version: 0.3.0-dev build bbb (MISMATCH)"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining(
        "Version: 0.3.0-dev build aaa (same source as daemon)",
      ),
    )
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
      expect.stringContaining("URL: http://127.0.0.1:5180"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("URL: http://127.0.0.1:52938"),
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
      expect.stringContaining("Model: MK.2 (ABC123)"),
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
      expect.stringContaining("Model: —"),
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
      expect.stringContaining("Model: —"),
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
      expect.stringContaining("URL: http://127.0.0.1:5180"),
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
      expect.stringContaining("Daemon: running"),
    )
    expect(logMock.info).toHaveBeenCalledWith(expect.stringContaining("Theme:"))
  })
})
