import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type pino from "pino"

import { createDarwinSessionProvider } from "../darwin"
import { type CommandExecutor } from "@/system/providers/shared"

const silentLogger = (): pino.Logger => {
  const noop = (): void => undefined
  return {
    info: vi.fn(noop),
    warn: vi.fn(noop),
    error: vi.fn(noop),
    debug: vi.fn(noop),
    trace: vi.fn(noop),
    fatal: vi.fn(noop),
    child: vi.fn(),
    level: "silent",
  } as unknown as pino.Logger
}

// `ioreg -n Root -d1 -a` emits the console session dictionary as a plist. The
// CGSSessionScreenIsLocked key is present and true only while the screen is
// locked; when unlocked the key is absent entirely.
const LOCKED_PLIST = `<dict>
  <key>CGSSessionScreenIsLocked</key>
  <true/>
  <key>kCGSSessionOnConsoleKey</key>
  <true/>
</dict>`

const UNLOCKED_PLIST = `<dict>
  <key>kCGSSessionOnConsoleKey</key>
  <true/>
</dict>`

const makeExecutor = (stdout: string, exitCode = 0): CommandExecutor => ({
  async run() {
    return { exitCode, stdout, stderr: "" }
  },
})

describe("createDarwinSessionProvider", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("reports locked when CGSSessionScreenIsLocked is true", async () => {
    const provider = await createDarwinSessionProvider({
      executor: makeExecutor(LOCKED_PLIST),
      logger: silentLogger(),
    })
    expect(provider.getState()).toBe("locked")
    await provider.stop()
  })

  it("reports unlocked when CGSSessionScreenIsLocked is absent", async () => {
    const provider = await createDarwinSessionProvider({
      executor: makeExecutor(UNLOCKED_PLIST),
      logger: silentLogger(),
    })
    expect(provider.getState()).toBe("unlocked")
    await provider.stop()
  })

  it("queries ioreg, not osascript", async () => {
    const run = vi.fn(async () => ({
      exitCode: 0,
      stdout: UNLOCKED_PLIST,
      stderr: "",
    }))
    const provider = await createDarwinSessionProvider({
      executor: { run } as unknown as CommandExecutor,
      logger: silentLogger(),
    })
    expect(run).toHaveBeenCalledWith(
      "ioreg",
      ["-n", "Root", "-d1", "-a"],
      expect.objectContaining({ timeoutMs: 2_000 }),
    )
    await provider.stop()
  })

  it("keeps the previous state when ioreg exits non-zero", async () => {
    const provider = await createDarwinSessionProvider({
      executor: makeExecutor("", 1),
      logger: silentLogger(),
    })
    expect(provider.getState()).toBe("unknown")
    await provider.stop()
  })

  it("subscriber fires on state change", async () => {
    let first = true
    const executor: CommandExecutor = {
      async run() {
        const stdout = first ? UNLOCKED_PLIST : LOCKED_PLIST
        first = false
        return { exitCode: 0, stdout, stderr: "" }
      },
    }
    const provider = await createDarwinSessionProvider({
      executor,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    const handler = vi.fn()
    provider.subscribe(handler)
    await vi.advanceTimersByTimeAsync(200)
    expect(handler).toHaveBeenCalledWith("locked")
    await provider.stop()
  })

  it("stop() halts the polling interval", async () => {
    const provider = await createDarwinSessionProvider({
      executor: makeExecutor(UNLOCKED_PLIST),
      logger: silentLogger(),
    })
    await provider.stop()
  })
})
