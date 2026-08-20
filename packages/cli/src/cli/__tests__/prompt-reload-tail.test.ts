import type pino from "pino"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockConfirm, mockTailLogs, mockReload } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
  mockTailLogs: vi.fn(async () => undefined),
  mockReload: vi.fn(async () => undefined),
}))

vi.mock("@/ui/console", () => ({
  confirm: mockConfirm,
}))
vi.mock("@/util/daemon", () => ({
  resolveDaemonPaths: () => ({
    runtimeDir: "/run/user/0",
    pidFile: "/run/user/0/sireno-deck.pid",
    tokenFile: "/run/user/0/sireno-deck.token",
    childrenFile: "/run/user/0/sireno-deck.children.json",
    configPathFile: "/run/user/0/sireno-deck.config",
    flagsFile: "/run/user/0/sireno-deck.flags.json",
  }),
}))
vi.mock("@/util/log-tail", () => ({
  tailLogs: mockTailLogs,
}))
vi.mock("../commands/reload", () => ({
  reload: mockReload,
}))

import { promptReloadAndTail, RELOAD_TAIL_WINDOW } from "../startup-display"

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

describe("promptReloadAndTail", () => {
  let savedIsTTY: boolean | undefined
  beforeEach(() => {
    vi.clearAllMocks()
    savedIsTTY = process.stdout.isTTY
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
      writable: false,
    })
  })
  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: savedIsTTY,
      configurable: true,
      writable: false,
    })
  })

  it("returns immediately when not a TTY (skips the prompt)", async () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
      writable: false,
    })

    await promptReloadAndTail({ logger: silentLogger() })

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockReload).not.toHaveBeenCalled()
    expect(mockTailLogs).not.toHaveBeenCalled()
  })

  it("skips reload + tail when the operator answers no", async () => {
    mockConfirm.mockResolvedValue(false)

    await promptReloadAndTail({ logger: silentLogger() })

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Reload") }),
    )
    expect(mockReload).not.toHaveBeenCalled()
    expect(mockTailLogs).not.toHaveBeenCalled()
  })

  it("calls reload and tails logs when the operator answers yes", async () => {
    mockConfirm.mockResolvedValue(true)

    await promptReloadAndTail({ logger: silentLogger() })

    expect(mockReload).toHaveBeenCalledTimes(1)
    expect(mockReload).toHaveBeenCalledWith(
      expect.objectContaining({ logger: expect.anything() }),
    )
    expect(mockTailLogs).toHaveBeenCalledTimes(1)
    expect(mockTailLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        logPath: "/run/user/0/service.log",
        follow: true,
        lines: 50,
      }),
    )
  })

  it("bounds the tail window so the prompt cannot strand the operator", () => {
    // ponytail: the tail is wrapped in Promise.race against a 2 s setTimeout
    // so the prompt can't trap the operator in a follow tail. Lock the
    // constant in code so a future change to that timeout is a conscious
    // decision (and visible in review).
    expect(RELOAD_TAIL_WINDOW).toBe(2_000)
  })
})
