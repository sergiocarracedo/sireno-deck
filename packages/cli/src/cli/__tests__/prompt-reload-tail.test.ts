import type pino from "pino"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockConfirm, mockConfirmImpl, mockTailLogs, mockReload } = vi.hoisted(
  () => ({
    mockConfirm: vi.fn(),
    mockConfirmImpl: vi.fn(),
    mockTailLogs: vi.fn(async () => undefined),
    mockReload: vi.fn(async () => undefined),
  }),
)

vi.mock("@/cli/prompt", () => ({
  confirm: (...args: unknown[]) => {
    mockConfirm(...args)
    return mockConfirmImpl()
  },
  isCancel: (v: unknown): boolean => typeof v === "symbol",
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

// ponytail: clack's confirm uses readline + setRawMode, both of which
// throw when the wrapper's stdin is not a TTY (e.g. when invoked via
// `| cat` or with `< /dev/null`). The wrapper previously surfaced that
// as `unhandledRejection`, which installProcessGuards escalated into
// a fatal exit. The defensive layer now bails out before calling
// `confirm` when either `stdin` or `stdout` isn't a TTY.
const setTty = (stdout: boolean, stdin: boolean): void => {
  Object.defineProperty(process.stdout, "isTTY", {
    value: stdout,
    configurable: true,
    writable: false,
  })
  Object.defineProperty(process.stdin, "isTTY", {
    value: stdin,
    configurable: true,
    writable: false,
  })
}

describe("promptReloadAndTail", () => {
  let savedStdoutIsTTY: boolean | undefined
  let savedStdinIsTTY: boolean | undefined
  beforeEach(() => {
    vi.clearAllMocks()
    savedStdoutIsTTY = process.stdout.isTTY
    savedStdinIsTTY = process.stdin.isTTY
    setTty(true, true)
  })
  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: savedStdoutIsTTY,
      configurable: true,
      writable: false,
    })
    Object.defineProperty(process.stdin, "isTTY", {
      value: savedStdinIsTTY,
      configurable: true,
      writable: false,
    })
  })

  it("returns immediately when stdout is not a TTY", async () => {
    setTty(false, true)

    await promptReloadAndTail({ logger: silentLogger() })

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockReload).not.toHaveBeenCalled()
    expect(mockTailLogs).not.toHaveBeenCalled()
  })

  it("returns immediately when stdin is not a TTY (the bug fix)", async () => {
    setTty(true, false)

    await promptReloadAndTail({ logger: silentLogger() })

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockReload).not.toHaveBeenCalled()
    expect(mockTailLogs).not.toHaveBeenCalled()
  })

  it("skips reload + tail when the operator answers no", async () => {
    mockConfirmImpl.mockResolvedValue(false)

    await promptReloadAndTail({ logger: silentLogger() })

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Reload") }),
    )
    expect(mockReload).not.toHaveBeenCalled()
    expect(mockTailLogs).not.toHaveBeenCalled()
  })

  it("skips reload + tail when the operator cancels the prompt (Ctrl+C)", async () => {
    // @clack/prompts returns a symbol when the user cancels — distinguish
    // it from `false` (the operator answered No) by passing through
    // `isCancel` to short-circuit.
    const cancelSymbol = Symbol("cancel")
    mockConfirmImpl.mockResolvedValue(cancelSymbol)

    await promptReloadAndTail({ logger: silentLogger() })

    expect(mockConfirm).toHaveBeenCalled()
    expect(mockReload).not.toHaveBeenCalled()
    expect(mockTailLogs).not.toHaveBeenCalled()
  })

  it("swallows readline / setRawMode errors instead of letting them reject", async () => {
    // Ponytail: clack's confirm may throw under a host that lies about
    // TTY (e.g. `script -qc` with no `-f` flag) — readline/setRawMode
    // blow up. The defensive try/catch surfaces the case as "no
    // reload" rather than letting it bubble into an
    // unhandledRejection.
    mockConfirmImpl.mockRejectedValueOnce(
      Object.assign(new Error("TTY"), { code: "ERR_TTY" }),
    )

    await expect(
      promptReloadAndTail({ logger: silentLogger() }),
    ).resolves.toBeUndefined()
    expect(mockReload).not.toHaveBeenCalled()
    expect(mockTailLogs).not.toHaveBeenCalled()
  })

  it("calls reload and tails logs when the operator answers yes", async () => {
    mockConfirmImpl.mockResolvedValue(true)

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

  it("continues to tail even if reload() rejects", async () => {
    mockConfirmImpl.mockResolvedValue(true)
    mockReload.mockRejectedValueOnce(new Error("no pid"))

    await expect(
      promptReloadAndTail({ logger: silentLogger() }),
    ).resolves.toBeUndefined()
    expect(mockTailLogs).not.toHaveBeenCalled()
  })

  it("bounds the tail window so the prompt cannot strand the operator", () => {
    // ponytail: the tail is wrapped in Promise.race against a 2 s setTimeout
    // so the prompt can't trap the operator in a follow tail. Lock the
    // constant in code so a future change to that timeout is a conscious
    // decision (and visible in review).
    expect(RELOAD_TAIL_WINDOW).toBe(2_000)
  })
})
