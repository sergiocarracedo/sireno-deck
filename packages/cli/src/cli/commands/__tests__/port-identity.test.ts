import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { readFileSyncMock, platformMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn(),
  platformMock: vi.fn((): NodeJS.Platform => "linux"),
}))

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
    platformMock.mockReturnValue("linux")
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns true when comm is 'sirenodeck:dm' and cmdline mentions sireno-deck", () => {
    // /proc/<pid>/comm is NUL-terminated; /proc/<pid>/cmdline is NUL-separated.
    // The mock returns realistic bytes (NUL terminator/separator).
    setProc("/proc/12345/comm", "sirenodeck:dm\u0000")
    readFileSyncMock.mockImplementation((p: unknown) => {
      if (p === "/proc/12345/comm") return "sirenodeck:dm\u0000"
      if (p === "/proc/12345/cmdline")
        return "node\u0000bin/sireno-deck.js\u0000start\u0000--emulator\u0000"
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

  it("returns false on non-linux (no /proc/comm)", () => {
    platformMock.mockReturnValue("darwin")
    expect(isOurDaemon(12345)).toBe(false)
  })

  it("returns false when comm matches but cmdline doesn't mention sireno-deck", () => {
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
