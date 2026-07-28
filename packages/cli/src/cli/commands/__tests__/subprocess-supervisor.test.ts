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
  kill(): boolean {
    this.killed = true
    return true
  }
}

describe("subprocess supervisor", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the first child and leaves it alone on graceful shutdown", async () => {
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
    handle.stop()
    first.emit("exit", 0, "SIGTERM")
    await vi.advanceTimersByTimeAsync(120_000)
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(onGiveUp).not.toHaveBeenCalled()
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
    // 1st crash (initial) → schedule retry 1
    c1.emit("exit", 1, null)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(spawn).toHaveBeenCalledTimes(2)
    // 2nd crash (retry 1) → schedule retry 2
    c2.emit("exit", 1, null)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(spawn).toHaveBeenCalledTimes(3)
    // 3rd crash (retry 2) → give up, no further respawn
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
    handle.stop()
    c1.emit("exit", 1, null)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(spawn).toHaveBeenCalledTimes(1)
    expect(onGiveUp).not.toHaveBeenCalled()
  })
})
