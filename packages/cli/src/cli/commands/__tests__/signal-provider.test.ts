import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { defaultSignals } from "../run"

describe("defaultSignals (mocked signal delivery)", () => {
  // ponytail: vitest worker forks use SIGUSR1 / SIGTERM as IPC signals, and
  // `process.kill(process.pid, "SIGUSR1")` from a worker test would be
  // received by vitest's own signal handler first — the worker dies with
  // a "Worker exited unexpectedly" error before our handler ever runs.
  // Patch the global `process.emit` so we can fire SIGUSR1 synthetically
  // without going through the OS signal queue.
  let origEmit: typeof process.emit
  let unregister: (() => void) | null = null

  beforeEach(() => {
    origEmit = process.emit.bind(process)
  })
  afterEach(() => {
    if (unregister !== null) unregister()
    unregister = null
    process.emit = origEmit
  })

  it("onReload registers a SIGUSR1 handler that fires when the signal fires", () => {
    const calls: number[] = []
    unregister = defaultSignals.onReload(() => {
      calls.push(1)
    })

    origEmit("SIGUSR1")

    expect(calls).toEqual([1])
  })

  it("onReload returns an unregister that removes the listener", () => {
    const calls: number[] = []
    const off = defaultSignals.onReload(() => {
      calls.push(1)
    })
    off()
    unregister = null

    origEmit("SIGUSR1")

    expect(calls).toEqual([])
  })

  it("multiple onReload registrations coexist and all fire", () => {
    const a: number[] = []
    const b: number[] = []
    const offA = defaultSignals.onReload(() => a.push(1))
    const offB = defaultSignals.onReload(() => b.push(1))
    unregister = () => {
      offA()
      offB()
    }

    origEmit("SIGUSR1")

    expect(a).toEqual([1])
    expect(b).toEqual([1])
  })

  it("onSignal and onReload are registered separately", () => {
    const signalCalls: number[] = []
    const reloadCalls: number[] = []
    const offSignal = defaultSignals.onSignal(() => signalCalls.push(1))
    const offReload = defaultSignals.onReload(() => reloadCalls.push(1))
    unregister = () => {
      offSignal()
      offReload()
    }

    origEmit("SIGUSR1")

    expect(reloadCalls).toEqual([1])
    expect(signalCalls).toEqual([])
  })
})
