import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getActiveAppProvider } from '../index'
import type { ActiveAppProbe, DbusClient, DbusBus } from '../provider'

function silentLogger() {
  return { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}

function makeMissingExtensionClient(): DbusClient {
  return {
    createSessionBus: () =>
      ({
        disconnect: vi.fn(),
        getProxyObject: vi.fn(async () => {
          throw new Error('ServiceUnknown: org.gnome.Shell')
        }),
      }) as DbusBus,
  }
}

function makePresentExtensionClient(focusClassImpl: () => Promise<string> = async () => 'firefox'): DbusClient {
  return {
    createSessionBus: () =>
      ({
        disconnect: vi.fn(),
        getProxyObject: vi.fn(async () => ({
          getInterface: () => ({ FocusClass: focusClassImpl }),
        })),
      }) as DbusBus,
  }
}

describe('getActiveAppProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a supported provider for darwin', async () => {
    const provider = await getActiveAppProvider({
      logger: silentLogger(),
      platform: 'darwin',
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns a supported provider for win32', async () => {
    const provider = await getActiveAppProvider({
      logger: silentLogger(),
      platform: 'win32',
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns a supported provider for linux when get-windows works', async () => {
    const probe: ActiveAppProbe = {
      async getActiveWindow() {
        return { owner: { name: 'firefox' } }
      },
    }
    const provider = await getActiveAppProvider({
      logger: silentLogger(),
      platform: 'linux',
      env: {},
      probe,
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('falls back to the GNOME extension after get-windows returns null repeatedly', async () => {
    const logger = silentLogger()
    const probe: ActiveAppProbe = {
      async getActiveWindow() {
        return null
      },
    }
    const provider = await getActiveAppProvider({
      logger,
      platform: 'linux',
      env: {},
      probe,
      dbusClient: makePresentExtensionClient(),
    })

    const changes: Array<{ ownerName: string } | null> = []
    provider.start((snapshot) => {
      changes.push(snapshot)
    })

    for (let i = 0; i < 5; i += 1) {
      await vi.advanceTimersByTimeAsync(500)
    }
    await vi.advanceTimersByTimeAsync(0)

    expect(provider.supportsActiveApp).toBe(true)
    expect(changes.some((c) => c?.ownerName === 'firefox')).toBe(true)
    expect(
      logger.info.mock.calls.some((call) =>
        call[1]?.includes('falling back to GNOME DBus extension'),
      ),
    ).toBe(true)

    provider.stop()
  })

  it('logs the GNOME extension install hint when fallback probe also fails', async () => {
    const logger = silentLogger()
    const probe: ActiveAppProbe = {
      async getActiveWindow() {
        return null
      },
    }
    const provider = await getActiveAppProvider({
      logger,
      platform: 'linux',
      env: {},
      probe,
      dbusClient: makeMissingExtensionClient(),
    })

    provider.start(() => {})

    for (let i = 0; i < 5; i += 1) {
      await vi.advanceTimersByTimeAsync(500)
    }
    await vi.advanceTimersByTimeAsync(0)

    expect(provider.supportsActiveApp).toBe(true)
    const installHint = logger.warn.mock.calls.find(
      (call) => call[1]?.includes('install it to enable active-app detection on Wayland'),
    )
    expect(installHint).toBeDefined()
    const context = installHint?.[0] as { installUrl?: string } | undefined
    expect(context?.installUrl).toBe(
      'https://extensions.gnome.org/extension/4974/window-calls-extended/',
    )

    provider.stop()
  })

  it('returns a supported provider for unknown platforms (then unsupported at the platform level)', async () => {
    const provider = await getActiveAppProvider({
      logger: silentLogger(),
      platform: 'aix' as NodeJS.Platform,
    })
    expect(provider.supportsActiveApp).toBe(false)
  })

  it('unsupported provider logs only once across multiple start() calls', async () => {
    const logger = silentLogger()
    const provider = await getActiveAppProvider({
      logger,
      platform: 'aix' as NodeJS.Platform,
    })
    provider.start(() => {})
    provider.start(() => {})
    provider.start(() => {})
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })
})
