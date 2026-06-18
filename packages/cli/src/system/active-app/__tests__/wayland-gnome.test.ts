import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createWaylandGnomeProvider } from '../wayland-gnome'
import type {
  DbusBus,
  DbusClient,
  DbusProxyInterface,
  DbusProxyObject,
} from '../provider'

function silentLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}

function makeDbusClient(
  focusClassImpl: () => Promise<string>,
  options: { throwOnGetProxy?: Error } = {},
): DbusClient & { disconnect: ReturnType<typeof vi.fn> } {
  const disconnect = vi.fn()
  const iface: DbusProxyInterface = {
    FocusClass: focusClassImpl,
  }
  const proxy: DbusProxyObject = {
    getInterface: vi.fn(() => iface),
  }
  const bus: DbusBus = {
    disconnect,
    getProxyObject: vi.fn(async () => {
      if (options.throwOnGetProxy) throw options.throwOnGetProxy
      return proxy
    }),
  }
  return {
    disconnect,
    createSessionBus: vi.fn(() => bus),
  }
}

describe('createWaylandGnomeProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a supported provider when the extension is reachable', async () => {
    const logger = silentLogger()
    const client = makeDbusClient(async () => 'firefox')

    const provider = await createWaylandGnomeProvider({ logger, dbusClient: client })

    expect(provider.supportsActiveApp).toBe(true)
    const changes: Array<{ ownerName: string } | null> = []
    provider.start((snapshot) => {
      changes.push(snapshot)
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(changes).toEqual([{ ownerName: 'firefox' }])

    provider.stop()
    expect(client.disconnect).toHaveBeenCalled()
  })

  it('returns unsupported and logs install hint when the extension is missing', async () => {
    const logger = silentLogger()
    const client = makeDbusClient(async () => '', {
      throwOnGetProxy: new Error('ServiceUnknown'),
    })

    const provider = await createWaylandGnomeProvider({ logger, dbusClient: client })

    expect(provider.supportsActiveApp).toBe(false)
    provider.start(() => {})

    const installWarn = logger.warn.mock.calls.find(
      (call) => call[1]?.includes('Window Calls Extended'),
    )
    expect(installWarn).toBeDefined()
    const context = installWarn?.[0] as { installUrl?: string } | undefined
    expect(context?.installUrl).toBe(
      'https://extensions.gnome.org/extension/4974/window-calls-extended/',
    )
  })

  it('emits null when the extension returns an empty class string after a real value', async () => {
    const logger = silentLogger()
    let call = 0
    const client = makeDbusClient(async () => {
      call += 1
      if (call === 1) return 'firefox'
      return ''
    })

    const provider = await createWaylandGnomeProvider({ logger, dbusClient: client })

    const changes: Array<{ ownerName: string } | null> = []
    provider.start((snapshot) => {
      changes.push(snapshot)
    })

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(500)

    expect(changes).toEqual([{ ownerName: 'firefox' }, null])

    provider.stop()
  })

  it('stops the poller after MAX_CONSECUTIVE_POLL_FAILURES in a row', async () => {
    const logger = silentLogger()
    const client = makeDbusClient(async () => {
      throw new Error('bus dropped')
    })

    const provider = await createWaylandGnomeProvider({ logger, dbusClient: client })

    const changes: Array<unknown> = []
    provider.start((snapshot) => {
      changes.push(snapshot)
    })

    for (let i = 0; i < 5; i += 1) {
      await vi.advanceTimersByTimeAsync(500)
    }
    await vi.advanceTimersByTimeAsync(500)

    expect(logger.warn).toHaveBeenCalledTimes(1)
    const [firstCall] = logger.warn.mock.calls
    expect(firstCall?.[1]).toContain('disabling poller')

    provider.stop()
  })
})
