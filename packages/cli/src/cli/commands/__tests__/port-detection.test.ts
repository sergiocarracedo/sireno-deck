import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type pino from "pino"

const { execFileSyncMock, readFileSyncMock, platformMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  platformMock: vi.fn((): NodeJS.Platform => "linux"),
}))

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>()
  return {
    ...actual,
    execFileSync: execFileSyncMock,
  }
})

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>()
  return {
    ...actual,
    readFileSync: readFileSyncMock,
    readdirSync: vi.fn(() => []),
    readlinkSync: vi.fn(() => null),
    existsSync: vi.fn(() => true),
  }
})

Object.defineProperty(process, "platform", {
  get: () => platformMock(),
  configurable: true,
})

const { detectPortPids } = await import("../start")

const silentLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as pino.Logger

describe("detectPortPids", () => {
  beforeEach(() => {
    execFileSyncMock.mockReset()
    readFileSyncMock.mockReset()
    platformMock.mockReturnValue("linux")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns pids from ss when ss finds them", () => {
    execFileSyncMock.mockImplementation((_cmd: string, args: unknown[]) => {
      if (Array.isArray(args) && args[0] === "-ltnp") {
        return 'LISTEN 0 4096 127.0.0.1:52937 users:(("node",pid=4242,fd=5))\n'
      }
      throw new Error("unexpected args")
    })
    readFileSyncMock.mockImplementation(() => "")
    const result = detectPortPids(52937, silentLogger)
    expect(result).toEqual([4242])
    expect(silentLogger.warn).not.toHaveBeenCalled()
  })

  it("falls back to lsof when ss fails", () => {
    execFileSyncMock.mockImplementation((cmd: string) => {
      if (cmd === "ss") {
        const err = new Error("spawn ss ENOENT") as NodeJS.ErrnoException
        err.code = "ENOENT"
        throw err
      }
      if (cmd === "lsof") return "9999\n"
      throw new Error("unexpected cmd")
    })
    readFileSyncMock.mockImplementation(() => "")
    const result = detectPortPids(52937, silentLogger)
    expect(result).toEqual([9999])
    expect(silentLogger.warn).not.toHaveBeenCalled()
  })

  it("does NOT warn when all backends run cleanly and find nothing", () => {
    execFileSyncMock.mockImplementation(() => "")
    readFileSyncMock.mockImplementation(() => "")
    const result = detectPortPids(52937, silentLogger)
    expect(result).toEqual([])
    // ponytail: this is the regression we fix — clean systems used to log
    // "port detection: all backends failed" 4× per start.
    expect(silentLogger.warn).not.toHaveBeenCalled()
  })

  it("warns once when every backend is missing", () => {
    const enoent = (): never => {
      const err = new Error("spawn ENOENT") as NodeJS.ErrnoException
      err.code = "ENOENT"
      throw err
    }
    execFileSyncMock.mockImplementation(enoent)
    readFileSyncMock.mockImplementation(enoent)
    const warnLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as pino.Logger
    const result = detectPortPids(52937, warnLogger)
    expect(result).toEqual([])
    expect(warnLogger.warn).toHaveBeenCalledTimes(1)
    const call = warnLogger.warn.mock.calls[0]
    expect(call?.[1]).toContain("no port-detection backends available")
  })

  it("does NOT warn when only one backend is missing (macOS-style)", () => {
    // ponytail: ss and lsof are present; /proc/net/tcp is unavailable because
    // the platform is non-linux. macOS and Windows don't ship /proc, so the
    // runner needs to remain silent when at least one backend succeeds —
    // otherwise every `p dev start` on those platforms would log a WARN.
    platformMock.mockReturnValue("darwin")
    execFileSyncMock.mockImplementation(() => "")
    readFileSyncMock.mockImplementation(() => "")
    const warnLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as pino.Logger
    const result = detectPortPids(52937, warnLogger)
    expect(result).toEqual([])
    expect(warnLogger.warn).not.toHaveBeenCalled()
  })

  it("does NOT warn when ss is missing but lsof works", () => {
    execFileSyncMock.mockImplementation((cmd: string) => {
      if (cmd === "ss") {
        const err = new Error("spawn ss ENOENT") as NodeJS.ErrnoException
        err.code = "ENOENT"
        throw err
      }
      if (cmd === "lsof") return ""
      throw new Error("unexpected cmd")
    })
    readFileSyncMock.mockImplementation(() => "")
    const warnLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as pino.Logger
    detectPortPids(52937, warnLogger)
    expect(warnLogger.warn).not.toHaveBeenCalled()
  })
})
