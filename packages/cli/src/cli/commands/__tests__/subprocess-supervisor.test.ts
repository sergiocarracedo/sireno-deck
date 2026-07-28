import { EventEmitter } from "node:events"

import type pino from "pino"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { supervise } from "../subprocess-supervisor"

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

class FakeChild extends EventEmitter {
  killed = false
  signal: NodeJS.Signals | null = null
  killedTimes = 0
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  kill(sig: NodeJS.Signals = "SIGTERM"): boolean {
    this.killed = true
    this.signal = sig
    this.killedTimes += 1
    return true
  }
}

// Ponytail: stop() is now async and awaits the child to die (SIGTERM then
// SIGKILL after a grace window). Tests must emit 'exit' on the FakeChild
// after stop() has registered its `child.once("exit")` listener — that
// resolves the await. The order is: stop() returns a pending promise,
// the test emits 'exit', the listener fires, the await resolves.
const killAndWaitForExit = async (
  handle: { stop: () => Promise<void> },
  child: FakeChild,
  signal: NodeJS.Signals | null = null,
): Promise<void> => {
  const stopPromise = handle.stop()
  // Microtask flush so stop() registers its child.once("exit") listener
  // before we emit. setImmediate would also work; microtask is cheaper.
  await Promise.resolve()
  child.emit("exit", null, signal)
  await stopPromise
}

describe("subprocess supervisor", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the first child and stop() kills it on graceful shutdown", async () => {
    const first = new FakeChild()
    const spawn = vi.fn().mockResolvedValue(first)
    const onGiveUp = vi.fn()
    const handle = await supervise({
      label: "frontend vite",
      spawn,
      onGiveUp,
      isShuttingDown: () => false,
      logger: silentLogger(),
    })
    expect(handle.process).toBe(first)
    await killAndWaitForExit(handle, first, "SIGTERM")
    await vi.advanceTimersByTimeAsync(120_000)
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(onGiveUp).not.toHaveBeenCalled()
    expect(first.killed).toBe(true)
    expect(first.signal).toBe("SIGTERM")
  })

  it("does not respawn when isShuttingDown() returns true", async () => {
    const first = new FakeChild()
    let shuttingDown = false
    const spawn = vi.fn().mockResolvedValue(first)
    const onGiveUp = vi.fn()
    await supervise({
      label: "frontend vite",
      spawn,
      onGiveUp,
      isShuttingDown: () => shuttingDown,
      logger: silentLogger(),
    })
    shuttingDown = true
    first.emit("exit", 1, null)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(onGiveUp).not.toHaveBeenCalled()
  })

  it("respawns after delayMs when child exits unexpectedly", async () => {
    const first = new FakeChild()
    const second = new FakeChild()
    const spawn = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
    const onGiveUp = vi.fn()
    await supervise({
      label: "frontend vite",
      spawn,
      onGiveUp,
      isShuttingDown: () => false,
      logger: silentLogger(),
    })
    first.emit("exit", 1, null)
    expect(spawn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(59_999)
    expect(spawn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(spawn).toHaveBeenCalledTimes(2)
    expect(onGiveUp).not.toHaveBeenCalled()
  })

  it("calls onGiveUp after maxRetries (2) exits", async () => {
    const c1 = new FakeChild()
    const c2 = new FakeChild()
    const c3 = new FakeChild()
    const spawn = vi
      .fn()
      .mockResolvedValueOnce(c1)
      .mockResolvedValueOnce(c2)
      .mockResolvedValueOnce(c3)
    const onGiveUp = vi.fn()
    await supervise({
      label: "frontend vite",
      spawn,
      onGiveUp,
      isShuttingDown: () => false,
      logger: silentLogger(),
    })
    c1.emit("exit", 1, null)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(spawn).toHaveBeenCalledTimes(2)
    c2.emit("exit", 1, null)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(spawn).toHaveBeenCalledTimes(3)
    c3.emit("exit", 1, null)
    expect(onGiveUp).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(spawn).toHaveBeenCalledTimes(3)
  })

  it("calls onGiveUp immediately if spawn itself rejects", async () => {
    const c1 = new FakeChild()
    const spawn = vi
      .fn()
      .mockResolvedValueOnce(c1)
      .mockRejectedValueOnce(new Error("spawn failed"))
    const onGiveUp = vi.fn()
    await supervise({
      label: "frontend vite",
      spawn,
      onGiveUp,
      isShuttingDown: () => false,
      logger: silentLogger(),
    })
    c1.emit("exit", 1, null)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(onGiveUp).toHaveBeenCalledTimes(1)
  })

  it("stop() prevents any further respawn after a crash", async () => {
    const c1 = new FakeChild()
    const c2 = new FakeChild()
    const spawn = vi.fn().mockResolvedValueOnce(c1).mockResolvedValueOnce(c2)
    const onGiveUp = vi.fn()
    const handle = await supervise({
      label: "frontend vite",
      spawn,
      onGiveUp,
      isShuttingDown: () => false,
      logger: silentLogger(),
    })
    await killAndWaitForExit(handle, c1, "SIGTERM")
    await vi.advanceTimersByTimeAsync(120_000)
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(onGiveUp).not.toHaveBeenCalled()
  })

  it("stop() after a respawn kills the current (respawned) child, not the initial", async () => {
    const first = new FakeChild()
    const second = new FakeChild()
    const spawn = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
    const onGiveUp = vi.fn()
    const handle = await supervise({
      label: "frontend vite",
      spawn,
      onGiveUp,
      isShuttingDown: () => false,
      logger: silentLogger(),
    })
    expect(handle.process).toBe(first)
    first.emit("exit", 1, null)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(spawn).toHaveBeenCalledTimes(2)
    expect(handle.process).toBe(second)
    // Closing must target the live respawned child — the previous regression
    // returned the stale initial and left the live vite holding its port.
    await killAndWaitForExit(handle, second, "SIGTERM")
    expect(second.killed).toBe(true)
    expect(first.killed).toBe(false)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(spawn).toHaveBeenCalledTimes(2)
    expect(onGiveUp).not.toHaveBeenCalled()
  })

  it("stop() SIGKILLs after grace if SIGTERM leaves the child alive", async () => {
    const first = new FakeChild()
    const spawn = vi.fn().mockResolvedValue(first)
    const onGiveUp = vi.fn()
    const handle = await supervise({
      label: "frontend vite",
      spawn,
      onGiveUp,
      isShuttingDown: () => false,
      logger: silentLogger(),
    })
    const stopPromise = handle.stop()
    await Promise.resolve() // let the SIGTERM listener register
    // No emit here — the child is "ignoring SIGTERM". Advance through the
    // grace window so the SIGKILL fallback fires.
    await vi.advanceTimersByTimeAsync(2_000)
    expect(first.killed).toBe(true)
    expect(first.signal).toBe("SIGKILL")
    // Now release the listener so stop() can resolve.
    first.emit("exit", null, "SIGKILL")
    await stopPromise
  })
})
