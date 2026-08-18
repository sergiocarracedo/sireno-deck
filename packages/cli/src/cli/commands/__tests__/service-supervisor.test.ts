import { EventEmitter } from "node:events"

import type { ChildProcess } from "node:child_process"
import type pino from "pino"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/util/device-config", () => ({
  loadDeviceConfig: vi.fn(),
}))

vi.mock("../spawn-daemon", async () => {
  const actual =
    await vi.importActual<typeof import("../spawn-daemon")>("../spawn-daemon")
  return {
    ...actual,
    spawnDetached: vi.fn(),
  }
})

import { loadDeviceConfig } from "@/util/device-config"

import { superviseService } from "../service-supervisor"
import { spawnDetached } from "../spawn-daemon"

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
  pid = 0
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  kill(sig: NodeJS.Signals = "SIGTERM"): boolean {
    this.killed = true
    this.signal = sig
    return true
  }
}

const mkChild = (pid: number): FakeChild => {
  const c = new FakeChild()
  c.pid = pid
  return c
}

const flushMicrotasks = async (n = 5): Promise<void> => {
  for (let i = 0; i < n; i++) await Promise.resolve()
}

const stopAndExit = async (
  handle: { stop: () => Promise<void> },
  child: FakeChild,
): Promise<void> => {
  const stopPromise = handle.stop()
  await flushMicrotasks()
  child.emit("exit", null, "SIGTERM")
  await stopPromise
}

describe("service-supervisor", () => {
  beforeEach(() => {
    vi.mocked(loadDeviceConfig).mockClear()
    vi.mocked(loadDeviceConfig).mockReturnValue(null)
    vi.mocked(spawnDetached).mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("spawns the daemon with the given args and writes the pid", async () => {
    const child = mkChild(4321)
    vi.mocked(spawnDetached).mockReturnValue({
      pid: 4321,
      child: child as unknown as ChildProcess,
    })
    const handle = await superviseService({
      xdgConfigHome: "/tmp/sireno",
      logger: silentLogger(),
      args: ["start"],
      remote: true,
      onGiveUp: () => undefined,
    })
    expect(spawnDetached).toHaveBeenCalledWith(
      expect.objectContaining({ args: ["start"], remote: true }),
    )
    expect(handle.pid).toBe(4321)
    await stopAndExit(handle, child)
  })

  it("calls onGiveUp and process.exit(1) after the retry schedule is exhausted", async () => {
    const children = [
      mkChild(101),
      mkChild(102),
      mkChild(103),
      mkChild(104),
      mkChild(105),
    ]
    let i = 0
    vi.mocked(spawnDetached).mockImplementation(() => {
      const c = children[i] ?? children[children.length - 1]!
      i += 1
      return { pid: c.pid, child: c as unknown as ChildProcess }
    })
    const onGiveUp = vi.fn(() => undefined)
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(
        (() => undefined) as unknown as (code?: number) => never,
      )
    await superviseService({
      xdgConfigHome: "/tmp/sireno",
      logger: silentLogger(),
      args: ["start"],
      onGiveUp,
      delayScheduleMs: [10, 10, 10, 10],
    })
    // Crash 5 times — each respawn fires within the 10ms delay window.
    for (let n = 0; n < children.length; n++) {
      children[n]!.emit("exit", 1, null)
      await flushMicrotasks(20)
      if (n < children.length - 1) {
        await new Promise((r) => setTimeout(r, 25))
      }
    }
    expect(onGiveUp).toHaveBeenCalledTimes(1)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it("does not push black frame when no device config is saved", async () => {
    const child = mkChild(201)
    vi.mocked(spawnDetached).mockReturnValue({
      pid: 201,
      child: child as unknown as ChildProcess,
    })
    vi.mocked(loadDeviceConfig).mockReturnValue(null)
    const handle = await superviseService({
      xdgConfigHome: "/tmp/sireno",
      logger: silentLogger(),
      args: ["start"],
      onGiveUp: () => undefined,
    })
    child.emit("exit", 1, null)
    await flushMicrotasks(20)
    expect(loadDeviceConfig).toHaveBeenCalledTimes(1)
    await stopAndExit(handle, child)
  })

  it("exits parent immediately when the daemon exits cleanly with code 0", async () => {
    const child = mkChild(501)
    vi.mocked(spawnDetached).mockReturnValue({
      pid: 501,
      child: child as unknown as ChildProcess,
    })
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(
        (() => undefined) as unknown as (code?: number) => never,
      )
    const handle = await superviseService({
      xdgConfigHome: "/tmp/sireno",
      logger: silentLogger(),
      args: ["start"],
      onGiveUp: () => undefined,
    })
    child.emit("exit", 0, null)
    await flushMicrotasks(20)
    expect(exitSpy).toHaveBeenCalledWith(0)
    await stopAndExit(handle, child)
  })

  it("exits parent immediately when the daemon exits via SIGTERM", async () => {
    const child = mkChild(502)
    vi.mocked(spawnDetached).mockReturnValue({
      pid: 502,
      child: child as unknown as ChildProcess,
    })
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(
        (() => undefined) as unknown as (code?: number) => never,
      )
    const handle = await superviseService({
      xdgConfigHome: "/tmp/sireno",
      logger: silentLogger(),
      args: ["start"],
      onGiveUp: () => undefined,
    })
    child.emit("exit", null, "SIGTERM")
    await flushMicrotasks(20)
    expect(exitSpy).toHaveBeenCalledWith(0)
    await stopAndExit(handle, child)
  })

  it("does not exit parent on crash exit code (regression: still retries)", async () => {
    const child = mkChild(503)
    vi.mocked(spawnDetached).mockReturnValue({
      pid: 503,
      child: child as unknown as ChildProcess,
    })
    vi.mocked(loadDeviceConfig).mockReturnValue(null)
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(
        (() => undefined) as unknown as (code?: number) => never,
      )
    const handle = await superviseService({
      xdgConfigHome: "/tmp/sireno",
      logger: silentLogger(),
      args: ["start"],
      onGiveUp: () => undefined,
    })
    child.emit("exit", 1, null)
    await flushMicrotasks(20)
    expect(exitSpy).not.toHaveBeenCalled()
    await stopAndExit(handle, child)
  })

  it("does not push black frame more than once across multiple crashes", async () => {
    const children = [mkChild(301), mkChild(302)]
    let i = 0
    vi.mocked(spawnDetached).mockImplementation(() => {
      const c = children[i] ?? children[children.length - 1]!
      i += 1
      return { pid: c.pid, child: c as unknown as ChildProcess }
    })
    vi.mocked(loadDeviceConfig).mockReturnValue({
      serial: "ABC",
      path: "x",
      model: "mk2",
    })
    await superviseService({
      xdgConfigHome: "/tmp/sireno",
      logger: silentLogger(),
      args: ["start"],
      onGiveUp: () => undefined,
      delayScheduleMs: [10],
    })
    // First crash: black frame pushed (loadDeviceConfig called once)
    children[0]!.emit("exit", 1, null)
    await flushMicrotasks(20)
    expect(loadDeviceConfig).toHaveBeenCalledTimes(1)
    // Second crash after respawn: black frame must NOT be pushed again.
    // We wait for the 10ms respawn delay to fire and the new child to be
    // wired up before emitting.
    await new Promise((r) => setTimeout(r, 30))
    await flushMicrotasks(20)
    children[1]!.emit("exit", 1, null)
    await flushMicrotasks(20)
    expect(loadDeviceConfig).toHaveBeenCalledTimes(1)
  })
})
