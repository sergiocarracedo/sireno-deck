import { describe, expect, it, vi } from 'vitest'

import { getActiveAppProvider } from './index'
import type { DbusClient, DbusBus } from './provider'

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

  it('returns a supported provider for linux when not pure Wayland', async () => {
    const provider = await getActiveAppProvider({
      logger: silentLogger(),
      platform: 'linux',
      env: {},
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns a supported provider on pure Wayland when the GNOME extension is reachable', async () => {
    const provider = await getActiveAppProvider({
      logger: silentLogger(),
      platform: 'linux',
      env: { XDG_SESSION_TYPE: 'wayland' },
      dbusClient: makePresentExtensionClient(),
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns an unsupported provider on pure Wayland when the GNOME extension is missing and logs the install hint', async () => {
    const logger = silentLogger()
    const provider = await getActiveAppProvider({
      logger,
      platform: 'linux',
      env: { XDG_SESSION_TYPE: 'wayland' },
      dbusClient: makeMissingExtensionClient(),
    })
    expect(provider.supportsActiveApp).toBe(false)
    provider.start(() => {})
    expect(logger.info).toHaveBeenCalledTimes(1)
    const [firstCall] = logger.info.mock.calls
    const [context, message] = firstCall ?? []
    expect(message).toContain('Window Calls Extended')
    expect((context as { installUrl?: string } | undefined)?.installUrl).toBe(
      'https://extensions.gnome.org/extension/4974/window-calls-extended/',
    )
  })

  it('returns a supported provider when XDG=wayland AND WAYLAND_DISPLAY is set (XWayland)', async () => {
    const provider = await getActiveAppProvider({
      logger: silentLogger(),
      platform: 'linux',
      env: { WAYLAND_DISPLAY: 'wayland-0', XDG_SESSION_TYPE: 'wayland' },
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns an unsupported provider for unknown platforms', async () => {
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
