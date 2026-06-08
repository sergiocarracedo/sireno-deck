import { describe, expect, it, vi } from 'vitest'

import type {
  ActiveAppProvider,
  ActiveAppProviderDeps,
  ActiveAppSnapshot,
} from './provider'
import {
  createActiveAppMonitor,
  createActiveAppMonitorDouble,
} from './active-app-monitor'

function makeMockProvider(): ActiveAppProvider & {
  emit: (s: ActiveAppSnapshot) => void
  getStartCount: () => number
  getStopCount: () => number
  setOnChange: (fn: (s: ActiveAppSnapshot) => void) => void
} {
  let onChange: ((s: ActiveAppSnapshot) => void) | undefined
  let startCount = 0
  let stopCount = 0
  return {
    supportsActiveApp: true,
    start(fn) {
      onChange = fn
      startCount += 1
    },
    stop() {
      onChange = undefined
      stopCount += 1
    },
    emit: (s) => onChange?.(s),
    getStartCount: () => startCount,
    getStopCount: () => stopCount,
    setOnChange: (fn) => {
      onChange = fn
    },
  }
}

describe('createActiveAppMonitor', () => {
  it('calls provider.start on start()', () => {
    const provider = makeMockProvider()
    const monitor = createActiveAppMonitor({
      provider,
      onChange: () => {},
    })
    monitor.start()
    expect(provider.getStartCount()).toBe(1)
  })

  it('calls provider.stop on stop()', () => {
    const provider = makeMockProvider()
    const monitor = createActiveAppMonitor({
      provider,
      onChange: () => {},
    })
    monitor.start()
    monitor.stop()
    expect(provider.getStopCount()).toBe(1)
  })

  it("passes the onChange callback through to the provider's start()", () => {
    const provider = makeMockProvider()
    const onChange = vi.fn()
    const monitor = createActiveAppMonitor({ provider, onChange })
    monitor.start()
    provider.emit({ ownerName: 'code' })
    expect(onChange).toHaveBeenCalledWith({ ownerName: 'code' })
  })
})

describe('createActiveAppMonitorDouble', () => {
  it('emits the initial snapshot on start()', () => {
    const double = createActiveAppMonitorDouble({
      initialSnapshot: { ownerName: 'code' },
    })
    const onChange = vi.fn()
    double.setOnChange(onChange)
    double.start()
    expect(onChange).toHaveBeenCalledWith({ ownerName: 'code' })
  })

  it('dedupes emits with the same ownerName', () => {
    const double = createActiveAppMonitorDouble()
    const onChange = vi.fn()
    double.setOnChange(onChange)
    double.emit({ ownerName: 'code' })
    double.emit({ ownerName: 'code' })
    double.emit({ ownerName: 'code' })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('emits when ownerName changes', () => {
    const double = createActiveAppMonitorDouble()
    const onChange = vi.fn()
    double.setOnChange(onChange)
    double.emit({ ownerName: 'code' })
    double.emit({ ownerName: 'firefox' })
    double.emit({ ownerName: 'code' })
    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenNthCalledWith(1, { ownerName: 'code' })
    expect(onChange).toHaveBeenNthCalledWith(2, { ownerName: 'firefox' })
    expect(onChange).toHaveBeenNthCalledWith(3, { ownerName: 'code' })
  })

  it('emits null when snapshot goes to null', () => {
    const double = createActiveAppMonitorDouble()
    const onChange = vi.fn()
    double.setOnChange(onChange)
    double.emit({ ownerName: 'code' })
    double.emit(null)
    double.emit(null) // dedupe
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenNthCalledWith(2, null)
  })

  it('counts start() and stop() invocations', () => {
    const double = createActiveAppMonitorDouble()
    double.start()
    double.start()
    double.start()
    expect(double.getStartCount()).toBe(3)
    double.stop()
    double.stop()
    expect(double.getStopCount()).toBe(2)
  })
})
