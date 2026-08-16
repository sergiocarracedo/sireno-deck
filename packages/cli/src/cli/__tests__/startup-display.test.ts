import { createServer } from "node:net"

import { afterEach, describe, expect, it, vi } from "vitest"

const introMock = vi.fn()
const outroMock = vi.fn()
const cancelMock = vi.fn()
const logInfoMock = vi.fn()

vi.mock("@/ui/console", () => ({
  intro: introMock,
  outro: outroMock,
  cancel: cancelMock,
  log: { info: logInfoMock },
}))

import {
  buildStartupBanner,
  formatFeaturesLine,
  isLogSuppressed,
  printStartupComplete,
  printStartupFailed,
  waitForDaemonReady,
} from "../startup-display"

const makeReport = () =>
  ({
    platform: "linux",
    homeDir: "/home/test",
    xdgConfigHome: "/home/test/.config",
    session: "x11",
    packageManager: "apt",
    capabilities: {
      keyMacro: {
        name: "keyMacro",
        available: true,
        missing: [],
        preferred: "ydotool",
        reason: "",
      },
      clipboard: {
        name: "clipboard",
        available: true,
        missing: [],
        preferred: "xclip",
        reason: "",
      },
      notification: {
        name: "notification",
        available: false,
        missing: ["notify-send"],
        preferred: "notify-send",
        reason: "",
      },
      activeApp: {
        name: "activeApp",
        available: true,
        missing: [],
        preferred: "xdotool",
        reason: "",
      },
    },
    udev: {
      rulesInstalled: true,
      rulesPath: "/etc/udev/rules.d/70.rules",
      streamDeckConnected: false,
      matchedProductIds: [],
    },
    config: { exists: true, path: "/home/test/.config/sireno-deck/config.yml" },
  }) as const

const fakeDeps = {
  probeAll: vi.fn(async () => makeReport()),
  probeMedia: vi.fn(async () => ({ available: true })),
  probeExec: vi.fn(async () => ({ available: true })),
  probeHttp: vi.fn(async () => ({ available: false, reason: "unreachable" })),
  listDevices: vi.fn(async () => []),
  resetCache: vi.fn(),
}

const originalIsTTY = process.stdout.isTTY

afterEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(process.stdout, "isTTY", {
    value: originalIsTTY,
    configurable: true,
  })
})

describe("isLogSuppressed", () => {
  it("suppresses on --quiet", () => {
    expect(isLogSuppressed({ quiet: true })).toBe(true)
  })

  it("suppresses on --log-level silent", () => {
    expect(isLogSuppressed({ logLevel: "silent" })).toBe(true)
  })

  it("suppresses on --log-level none", () => {
    expect(isLogSuppressed({ logLevel: "none" })).toBe(true)
  })

  it("does not suppress by default", () => {
    expect(isLogSuppressed({})).toBe(false)
    expect(isLogSuppressed({ logLevel: "info" })).toBe(false)
  })
})

describe("formatFeaturesLine", () => {
  it("renders available items with checkmarks", () => {
    const line = formatFeaturesLine([
      { name: "keystrokes", available: true },
      { name: "clipboard", available: true },
    ])
    expect(line).toBe("[✓ keystrokes] [✓ clipboard]")
  })

  it("renders unavailable items with reason", () => {
    const line = formatFeaturesLine([
      { name: "keystrokes", available: false, reason: "ydotool" },
    ])
    expect(line).toBe("[✗ keystrokes — ydotool]")
  })

  it("renders unavailable items without reason", () => {
    const line = formatFeaturesLine([{ name: "http", available: false }])
    expect(line).toBe("[✗ http]")
  })
})

describe("buildStartupBanner", () => {
  it("returns null when --quiet", async () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    const result = await buildStartupBanner(
      { emulator: false },
      { quiet: true },
      fakeDeps,
    )
    expect(result).toBeNull()
    expect(introMock).not.toHaveBeenCalled()
  })

  it("returns null when not a TTY", async () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    })
    const result = await buildStartupBanner({ emulator: false }, {}, fakeDeps)
    expect(result).toBeNull()
    expect(introMock).not.toHaveBeenCalled()
  })

  it("prints the banner with intro, device, and features", async () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    const result = await buildStartupBanner(
      { emulator: true, deviceModel: "xl" },
      {},
      fakeDeps,
    )
    expect(introMock).toHaveBeenCalledWith("Starting SirenoDeck")
    expect(logInfoMock).toHaveBeenCalledWith("Device: Emulator (xl)")
    expect(logInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("[✓ keystrokes]"),
    )
    expect(result?.featuresLine).toContain("[✗ notifications")
    expect(result?.featuresLine).toContain("[✗ http — unreachable]")
    expect(fakeDeps.resetCache).toHaveBeenCalled()
  })

  it("shows 'detecting…' when no devices and not emulator", async () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    await buildStartupBanner({ emulator: false }, {}, fakeDeps)
    expect(logInfoMock).toHaveBeenCalledWith("Device: detecting…")
  })

  it("uses detected device label", async () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    const deps = {
      ...fakeDeps,
      listDevices: vi.fn(async () => [
        {
          id: "SERIAL123",
          model: "MK2",
          keyCount: 15,
          label: "MK2",
          transport: "real" as const,
        },
      ]),
    }
    await buildStartupBanner({ emulator: false }, {}, deps)
    expect(logInfoMock).toHaveBeenCalledWith("Device: MK2 (SERIAL123)")
  })
})

describe("printStartupComplete/Failed", () => {
  it("calls outro when TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    printStartupComplete()
    expect(outroMock).toHaveBeenCalledWith("✓ SirenoDeck started")
  })

  it("skips when not TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    })
    printStartupComplete()
    expect(outroMock).not.toHaveBeenCalled()
  })

  it("prints cancel with error message", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    printStartupFailed(new Error("boom"))
    expect(cancelMock).toHaveBeenCalledWith(
      "✗ Failed to start SirenoDeck: boom",
    )
  })
})

describe("waitForDaemonReady", () => {
  it("resolves when a TCP listener accepts", async () => {
    const server = createServer((sock) => sock.end())
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const addr = server.address()
    if (addr === null || typeof addr === "string") {
      server.close()
      throw new Error("no port")
    }
    try {
      await waitForDaemonReady(addr.port, 2_000)
    } finally {
      server.close()
    }
  })

  it("throws when no listener accepts within the timeout", async () => {
    await expect(waitForDaemonReady(1, 200)).rejects.toBeUndefined()
  })
})
