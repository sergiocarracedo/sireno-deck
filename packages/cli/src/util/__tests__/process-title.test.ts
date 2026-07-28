import { platform } from "node:process"

import type pino from "pino"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DAEMON_TITLE,
  FOREGROUND_TITLE,
  PROCESS_TITLE_MAX,
  readParentPid,
  setProcessTitle,
  startParentDeathWatchdog,
} from "../process-title"

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

describe("setProcessTitle", () => {
  const originalTitle = process.title

  afterEach(() => {
    process.title = originalTitle
  })

  it("assigns the given title and returns it", () => {
    setProcessTitle("sirenodeck:dm")
    expect(process.title).toBe("sirenodeck:dm")
  })

  it("truncates to 15 chars on Linux (the comm field size)", () => {
    if (platform !== "linux") return
    const long = "sirenodeck:frontend-vite"
    expect(long.length).toBeGreaterThan(PROCESS_TITLE_MAX)
    const capped = setProcessTitle(long)
    expect(capped.length).toBe(PROCESS_TITLE_MAX)
    expect(process.title).toBe(capped)
  })

  it("does not truncate on non-Linux platforms", () => {
    if (platform === "linux") return
    const long = "sirenodeck:frontend-vite"
    const capped = setProcessTitle(long)
    expect(capped).toBe(long)
  })

  it("exposes the agreed role constants", () => {
    expect(DAEMON_TITLE).toBe("sirenodeck:dm")
    expect(FOREGROUND_TITLE).toBe("sirenodeck:cli")
    // Both under the 15-char Linux comm limit.
    expect(DAEMON_TITLE.length).toBeLessThanOrEqual(PROCESS_TITLE_MAX)
    expect(FOREGROUND_TITLE.length).toBeLessThanOrEqual(PROCESS_TITLE_MAX)
  })
})

describe("readParentPid", () => {
  it("returns a positive integer on Linux or null elsewhere", () => {
    const ppid = readParentPid()
    if (platform === "linux") {
      expect(ppid).not.toBeNull()
      expect(ppid).toBeGreaterThan(0)
    } else {
      expect(ppid).toBeNull()
    }
  })
})

describe("startParentDeathWatchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("is a no-op on non-Linux platforms", () => {
    if (platform === "linux") return // Linux path covered by the cases below
    const stop = startParentDeathWatchdog({
      logger: silentLogger(),
      onOrphan: () => undefined,
    })
    expect(stop).toBeNull()
  })

  it("is a no-op when bootPpid is 1 (already under init / systemd)", () => {
    if (platform !== "linux") return
    const stop = startParentDeathWatchdog({
      logger: silentLogger(),
      onOrphan: () => undefined,
      bootPpid: 1,
    })
    expect(stop).toBeNull()
  })

  it("calls onOrphan when the recorded ppid no longer matches", async () => {
    if (platform !== "linux") return
    const onOrphan = vi.fn()
    const stop = startParentDeathWatchdog({
      logger: silentLogger(),
      onOrphan,
      intervalMs: 1_000,
      bootPpid: 99_999_999,
    })
    expect(stop).not.toBeNull()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(onOrphan).toHaveBeenCalledTimes(1)
    stop?.()
  })

  it("returns a stop function that clears the interval", () => {
    if (platform !== "linux") return
    const onOrphan = vi.fn()
    const stop = startParentDeathWatchdog({
      logger: silentLogger(),
      onOrphan,
      intervalMs: 1_000,
      bootPpid: 99_999_999,
    })
    expect(stop).not.toBeNull()
    stop?.()
    vi.advanceTimersByTime(10_000)
    expect(onOrphan).not.toHaveBeenCalled()
  })
})
