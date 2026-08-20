import type pino from "pino"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockStart, mockStop, mockEnsureInstalled, mockInvokeManager } =
  vi.hoisted(() => ({
    mockStart: vi.fn(async () => undefined),
    mockStop: vi.fn(async () => undefined),
    mockEnsureInstalled: vi.fn(async () => undefined),
    mockInvokeManager: vi.fn(async () => undefined),
  }))

vi.mock("../start", () => ({
  default: mockStart,
}))
vi.mock("../stop", () => ({
  default: mockStop,
}))
vi.mock("../service-manager", () => ({
  ensureInstalled: mockEnsureInstalled,
  invokeManager: mockInvokeManager,
}))
vi.mock("@/util/daemon", async () => {
  const actual =
    await vi.importActual<typeof import("@/util/daemon")>("@/util/daemon")
  return {
    ...actual,
    // ponytail: restart's pollForPid polls readPid+isRunning until the daemon
    // appears or the 5s deadline elapses. Tests assert "restart called stop
    // and start"; they don't care about polling, so make isRunning return
    // true on the first read to short-circuit the loop.
    isRunning: vi.fn(() => true),
    readPid: vi.fn(() => 42),
    readFlags: vi.fn(() => null),
    resolveDaemonPaths: vi.fn(() => ({
      runtimeDir: "/run/user/0",
      pidFile: "/run/user/0/sireno-deck.pid",
      tokenFile: "/run/user/0/sireno-deck.token",
      childrenFile: "/run/user/0/sireno-deck.children.json",
      configPathFile: "/run/user/0/sireno-deck.config",
      flagsFile: "/run/user/0/sireno-deck.flags.json",
    })),
  }
})

import { restart } from "../restart"
import start from "../start"
import stop from "../stop"
import { invokeManager } from "../service-manager"
import { readFlags } from "@/util/daemon"

const silentLogger = (): pino.Logger =>
  ({
    info: () => undefined,
    warn: () => undefined,
    debug: () => undefined,
    error: () => undefined,
    fatal: () => undefined,
    trace: () => undefined,
    child: () => silentLogger(),
    level: "silent",
    silent: () => undefined,
  }) as unknown as pino.Logger

const setDevArgv = (): void => {
  process.argv[1] = "/tmp/sireno-deck/src/cli/main.ts"
}
const setProdArgv = (): void => {
  process.argv[1] = "/usr/local/bin/sirenodeck"
}

describe("restart (dev branch)", () => {
  let savedArgv1: string | undefined
  beforeEach(() => {
    vi.clearAllMocks()
    savedArgv1 = process.argv[1]
  })
  afterEach(() => {
    process.argv[1] = savedArgv1
  })

  it("runs stop + start (not invokeManager) when invoked from a .ts entry point", async () => {
    setDevArgv()
    vi.mocked(readFlags).mockReturnValue({
      emulator: true,
      httpPort: 3939,
    })

    await restart({ logger: silentLogger() })

    expect(stop).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(1)
    expect(invokeManager).not.toHaveBeenCalled()
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ emulator: true, httpPort: 3939 }),
    )
  })

  it("warns and returns when flags.json is missing (no daemon was ever started)", async () => {
    setDevArgv()
    vi.mocked(readFlags).mockReturnValue(null)
    const warns: Array<{ msg: string }> = []
    const logger = {
      ...silentLogger(),
      warn: (obj: unknown, msg?: string) => {
        warns.push({ msg: msg ?? String(obj) })
      },
    } as unknown as pino.Logger

    await restart({ logger })

    expect(stop).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
    expect(invokeManager).not.toHaveBeenCalled()
    expect(warns.some((w) => w.msg.includes("flags.json"))).toBe(true)
  })

  it("forwards every persisted flag back into the new start() call", async () => {
    setDevArgv()
    vi.mocked(readFlags).mockReturnValue({
      emulator: false,
      remote: true,
      deviceModel: "plus",
      port: 52937,
      httpPort: 4040,
    })

    await restart({ logger: silentLogger() })

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        emulator: false,
        remote: true,
        deviceModel: "plus",
        port: 52937,
        httpPort: 4040,
      }),
    )
  })

  it("uses invokeManager when invoked from the production .js entry point", async () => {
    setProdArgv()

    await restart({ logger: silentLogger() })

    expect(invokeManager).toHaveBeenCalledWith(
      expect.objectContaining({ action: "restart" }),
    )
    expect(stop).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })
})
