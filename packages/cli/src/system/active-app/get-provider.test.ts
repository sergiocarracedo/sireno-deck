import { describe, expect, it, vi } from 'vitest'

import { getActiveAppProvider } from './index'

function silentLogger() {
  return { warn: vi.fn(), error: vi.fn() }
}

describe('getActiveAppProvider', () => {
  it('returns a supported provider for darwin', () => {
    const provider = getActiveAppProvider({
      logger: silentLogger(),
      platform: 'darwin',
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns a supported provider for win32', () => {
    const provider = getActiveAppProvider({
      logger: silentLogger(),
      platform: 'win32',
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns a supported provider for linux when not pure Wayland', () => {
    const provider = getActiveAppProvider({
      logger: silentLogger(),
      platform: 'linux',
      env: {},
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns an unsupported provider on pure Wayland (XDG=wayland, no WAYLAND_DISPLAY)', () => {
    const logger = silentLogger()
    const provider = getActiveAppProvider({
      logger,
      platform: 'linux',
      env: { XDG_SESSION_TYPE: 'wayland' },
    })
    expect(provider.supportsActiveApp).toBe(false)
    provider.start(() => {})
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('returns a supported provider when XDG=wayland AND WAYLAND_DISPLAY is set (XWayland)', () => {
    const provider = getActiveAppProvider({
      logger: silentLogger(),
      platform: 'linux',
      env: { WAYLAND_DISPLAY: 'wayland-0', XDG_SESSION_TYPE: 'wayland' },
    })
    expect(provider.supportsActiveApp).toBe(true)
  })

  it('returns an unsupported provider for unknown platforms', () => {
    const provider = getActiveAppProvider({
      logger: silentLogger(),
      platform: 'aix' as NodeJS.Platform,
    })
    expect(provider.supportsActiveApp).toBe(false)
  })

  it('unsupported provider logs only once across multiple start() calls', () => {
    const logger = silentLogger()
    const provider = getActiveAppProvider({
      logger,
      platform: 'aix' as NodeJS.Platform,
    })
    provider.start(() => {})
    provider.start(() => {})
    provider.start(() => {})
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })
})
