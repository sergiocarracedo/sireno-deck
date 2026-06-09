import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLinuxProvider } from './linux'
import type { ActiveAppProbe } from './provider'

function silentLogger() {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}

describe('createLinuxProvider poll failure cap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps polling while individual polls fail intermittently', async () => {
    const logger = silentLogger()
    let attempt = 0
    const probe: ActiveAppProbe = {
      async getActiveWindow() {
        attempt += 1
        if (attempt === 1) {
          throw new Error('transient')
        }
        return { owner: { name: 'chrome' } }
      },
    }

    const provider = await createLinuxProvider({ logger, probe }, {})
    const changes: Array<{ ownerName: string } | null> = []
    provider.start((snapshot) => {
      changes.push(snapshot)
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)

    expect(logger.warn).not.toHaveBeenCalled()
    expect(changes.some((c) => c?.ownerName === 'chrome')).toBe(true)

    provider.stop()
  })

  it('stops the poller after MAX_CONSECUTIVE_POLL_FAILURES in a row', async () => {
    const logger = silentLogger()
    const probe: ActiveAppProbe = {
      async getActiveWindow() {
        throw new Error('no display')
      },
    }

    const provider = await createLinuxProvider({ logger, probe }, {})
    const changes: Array<unknown> = []
    provider.start((snapshot) => {
      changes.push(snapshot)
    })

    for (let i = 0; i < 5; i += 1) {
      await vi.advanceTimersByTimeAsync(500)
    }
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)

    expect(logger.warn).toHaveBeenCalledTimes(1)
    const [firstCall] = logger.warn.mock.calls
    expect(firstCall?.[1]).toContain('falling back to GNOME DBus extension')

    provider.stop()
  })

  it('emits the active owner name on successful polls', async () => {
    const logger = silentLogger()
    const probe: ActiveAppProbe = {
      async getActiveWindow() {
        return { owner: { name: 'firefox' } }
      },
    }

    const provider = await createLinuxProvider({ logger, probe }, {})
    const changes: Array<{ ownerName: string } | null> = []
    provider.start((snapshot) => {
      changes.push(snapshot)
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(changes).toEqual([{ ownerName: 'firefox' }])

    provider.stop()
  })
})
