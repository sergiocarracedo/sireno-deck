import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { readFileSyncMock, platformMock, execFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn(),
  platformMock: vi.fn((): NodeJS.Platform => "linux"),
  execFileSyncMock: vi.fn(),
}))

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>()
  return { ...actual, execFileSync: execFileSyncMock }
})

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>()
  return {
    ...actual,
    readFileSync: readFileSyncMock,
  }
})

Object.defineProperty(process, "platform", {
  get: () => platformMock(),
  configurable: true,
})

const { isOurDaemon } = await import("../port-identity")

const setProc = (path: string, contents: string): void => {
  readFileSyncMock.mockImplementation((p: unknown) => {
    if (typeof p === "string" && p === path) return contents
    throw new Error(`ENOENT: ${String(p)}`)
  })
}

describe("isOurDaemon", () => {
  beforeEach(() => {
    readFileSyncMock.mockReset()
    execFileSyncMock.mockReset()
    execFileSyncMock.mockImplementation(() => {
      throw new Error("no ps in this test")
    })
    platformMock.mockReturnValue("linux")
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns true when comm is 'sirenodeck:dm' and cmdline mentions sirenodeck", () => {
    // /proc/<pid>/comm is NUL-terminated; /proc/<pid>/cmdline is NUL-separated.
    // The mock returns realistic bytes (NUL terminator/separator).
    setProc("/proc/12345/comm", "sirenodeck:dm\u0000")
    readFileSyncMock.mockImplementation((p: unknown) => {
      if (p === "/proc/12345/comm") return "sirenodeck:dm\u0000"
      if (p === "/proc/12345/cmdline")
        return "node\u0000bin/sirenodeck.js\u0000start\u0000--emulator\u0000"
      throw new Error(`ENOENT: ${String(p)}`)
    })
    expect(isOurDaemon(12345)).toBe(true)
  })

  it("returns false when comm doesn't match", () => {
    readFileSyncMock.mockImplementation((p: unknown) => {
      if (p === "/proc/9999/comm") return "vite\u0000"
      if (p === "/proc/9999/cmdline") return "node\u0000vite\u0000"
      throw new Error(`ENOENT: ${String(p)}`)
    })
    expect(isOurDaemon(9999)).toBe(false)
  })

  /**
   * macOS has no /proc at all. This used to be a hard `return false` before
   * any lookup, which did not fail safe — it failed blind: the daemon's own
   * vite was reported as "a process that is NOT a sirenodeck child", stale
   * daemons holding the WS port were never reaped, and the orphans that
   * blocked the next start were left running. `ps` answers the same question.
   */
  it("identifies our daemon through ps when there is no /proc", () => {
    platformMock.mockReturnValue("darwin")
    readFileSyncMock.mockImplementation(() => {
      throw new Error("ENOENT: no /proc on darwin")
    })
    execFileSyncMock.mockImplementation((_bin: unknown, args: unknown) => {
      const field = (args as string[])[3]
      if (field === "comm=") return "sirenodeck:dm\n"
      if (field === "command=") return "node bin/sirenodeck.js start\n"
      return ""
    })
    expect(isOurDaemon(12345)).toBe(true)
  })

  it("recognises the foreground CLI that hosts an in-process daemon", () => {
    // A Mac only ever sees `sirenodeck:cli` for a daemon started in the
    // foreground, so matching the `:dm` title alone left it unrecognised.
    platformMock.mockReturnValue("darwin")
    readFileSyncMock.mockImplementation(() => {
      throw new Error("ENOENT")
    })
    execFileSyncMock.mockImplementation((_bin: unknown, args: unknown) => {
      const field = (args as string[])[3]
      if (field === "comm=") return "sirenodeck:cli\n"
      if (field === "command=") return "sirenodeck:cli\n"
      return ""
    })
    expect(isOurDaemon(12345)).toBe(true)
  })

  it("leaves an unrelated darwin process alone", () => {
    platformMock.mockReturnValue("darwin")
    readFileSyncMock.mockImplementation(() => {
      throw new Error("ENOENT")
    })
    execFileSyncMock.mockImplementation((_bin: unknown, args: unknown) => {
      const field = (args as string[])[3]
      if (field === "comm=") return "Google Chrome\n"
      return "/Applications/Google Chrome.app\n"
    })
    expect(isOurDaemon(12345)).toBe(false)
  })

  it("returns false when comm matches but cmdline doesn't mention sirenodeck", () => {
    // ponytail: identity gate must require BOTH comm + cmdline match. A
    // hypothetical supervisor that renames any process to "sirenodeck:dm"
    // would otherwise pass this check and get reaped.
    readFileSyncMock.mockImplementation((p: unknown) => {
      if (p === "/proc/7777/comm") return "sirenodeck:dm\u0000"
      if (p === "/proc/7777/cmdline")
        return "node\u0000some-unrelated-tool\u0000"
      throw new Error(`ENOENT: ${String(p)}`)
    })
    expect(isOurDaemon(7777)).toBe(false)
  })

  it("returns false when /proc/<pid>/comm is unreadable (process gone)", () => {
    // Process exited between port lookup and our read — treat as not-ours.
    readFileSyncMock.mockImplementation(() => {
      throw new Error("ENOENT: no such process")
    })
    expect(isOurDaemon(424242)).toBe(false)
  })
})
