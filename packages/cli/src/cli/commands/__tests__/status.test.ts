import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  introMock,
  logMock,
  outroMock,
  cancelMock,
  readPidMock,
  isRunningMock,
  readTokenMock,
  readFlagsMock,
  readRuntimeStateMock,
  readChildrenMock,
  readConfigPathMock,
} = vi.hoisted(() => ({
  introMock: vi.fn(),
  logMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn() },
  outroMock: vi.fn(),
  cancelMock: vi.fn(),
  readPidMock: vi.fn(),
  isRunningMock: vi.fn(),
  readTokenMock: vi.fn(),
  readFlagsMock: vi.fn(),
  readRuntimeStateMock: vi.fn(),
  readChildrenMock: vi.fn(),
  readConfigPathMock: vi.fn(),
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
  readToken: (...args: unknown[]) => readTokenMock(...args),
  readFlags: (...args: unknown[]) => readFlagsMock(...args),
  readRuntimeState: (...args: unknown[]) => readRuntimeStateMock(...args),
  readChildren: (...args: unknown[]) => readChildrenMock(...args),
  readConfigPath: (...args: unknown[]) => readConfigPathMock(...args),
  resolveDaemonPaths: vi.fn(() => ({ pidFile: "/tmp/test.pid" })),
}))

vi.mock("../startup-display", () => ({
  printDaemonUrl: vi.fn(async () => undefined),
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
  readTokenMock.mockReturnValue(null)
  readFlagsMock.mockReturnValue(null)
  readRuntimeStateMock.mockReturnValue(null)
  readChildrenMock.mockReturnValue(null)
  readConfigPathMock.mockReturnValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("status", () => {
  it("reports not running when pid file is missing", async () => {
    readPidMock.mockReturnValue(null)
    await status({ logger: mockLogger })
    expect(introMock).toHaveBeenCalledWith("sireno-deck status")
    expect(logMock.error).toHaveBeenCalledWith("Daemon is not running")
    expect(cancelMock).toHaveBeenCalledWith(
      expect.stringContaining("No daemon"),
    )
  })

  it("reports stale pid file with no other artifacts", async () => {
    readPidMock.mockReturnValue(99999999)
    isRunningMock.mockReturnValue(false)
    await status({ logger: mockLogger })
    expect(introMock).toHaveBeenCalledWith("sireno-deck status")
    expect(logMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("stale pid file"),
    )
    expect(cancelMock).toHaveBeenCalledWith(
      expect.stringContaining("Stale pid file"),
    )
  })

  it("reports running daemon with token preview + children", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readTokenMock.mockReturnValue("abcdefghijklmnopqrstuv")
    readFlagsMock.mockReturnValue({
      emulator: true,
      httpPort: 3939,
      remote: false,
    })
    readRuntimeStateMock.mockReturnValue({
      emulatorUrl: "http://127.0.0.1:52938",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      token: "tok",
      lanHost: "127.0.0.1",
      addresses: [],
      emulatorMode: true,
      remote: false,
      startedAt: Date.now() - 60000,
      theme: "default",
    })
    readChildrenMock.mockReturnValue({ pids: [100, 200, 300] } as any)
    readConfigPathMock.mockReturnValue(
      "/home/test/.config/sireno-deck/config.yml",
    )

    await status({ logger: mockLogger })

    expect(introMock).toHaveBeenCalledWith("sireno-deck status")
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("running for"),
    )
    expect(logMock.info).toHaveBeenCalledWith(expect.stringContaining("Mode:"))
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Remote:"),
    )
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Config:"),
    )
    expect(logMock.info).toHaveBeenCalledWith(expect.stringContaining("Theme:"))
    expect(logMock.info).toHaveBeenCalledWith(expect.stringContaining("Token:"))
    expect(logMock.info).toHaveBeenCalledWith(
      expect.stringContaining("Children:"),
    )
    expect(outroMock).toHaveBeenCalledWith("✓ Status snapshot")
  })

  it("warns when token file is missing for a running daemon", async () => {
    const pid = process.pid
    readPidMock.mockReturnValue(pid)
    isRunningMock.mockReturnValue(true)
    readTokenMock.mockReturnValue(null)
    await status({ logger: mockLogger })
    expect(logMock.warn).toHaveBeenCalledWith(expect.stringContaining("Token:"))
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
      emulatorUrl: "http://127.0.0.1:52938",
      wsUrl: "ws://127.0.0.1:52937",
      frontendUrl: "http://127.0.0.1:5180",
      token: "tok",
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
