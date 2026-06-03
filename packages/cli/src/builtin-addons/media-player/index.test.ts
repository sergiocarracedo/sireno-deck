import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createMediaControllerMock,
  getSnapshotMock,
  togglePlayPauseMock,
} = vi.hoisted(() => ({
  createMediaControllerMock: vi.fn(),
  getSnapshotMock: vi.fn(),
  togglePlayPauseMock: vi.fn(),
}))

vi.mock('./domain/media-controller.js', async () => {
  const actual = await vi.importActual<typeof import('./domain/media-controller.js')>(
    './domain/media-controller.js',
  )

  return {
    ...actual,
    createMediaController: createMediaControllerMock,
  }
})

import { createBundledAddonRegistry } from '../../config/loader.js'
import { validateConfig } from '../../core/schemas.js'
import { renderReactNodeToHtml } from '../../render/dom-host.js'
import mediaPlayerAddon from './index.js'

const mountedButtonMethods = {
  getActiveDeckId: () => 'main',
  goBack() {},
  invalidate() {},
  navigateToDeck() {},
  runCommand: async () => ({}) as never,
}

function createStoreScope(initialSnapshot?: unknown) {
  let snapshot = initialSnapshot

  return {
    clear() {
      snapshot = undefined
    },
    get snapshot() {
      return snapshot
    },
    set(value: unknown) {
      snapshot = value
    },
    update(updater: (current: unknown) => unknown) {
      snapshot = updater(snapshot)
    },
  }
}

function createMountedHarness(
  config: unknown,
  methodOverrides: Partial<typeof mountedButtonMethods> = {},
) {
  const definition = mediaPlayerAddon.buttons[0]
  const props = {
    button: { position: 0, type: definition!.type },
    config,
    frameState: 'idle',
    hostContext: {
      os: { type: 'linux', variant: 'ubuntu', version: '24.04' },
      session: { capability: 'supported', state: 'unlocked' },
    },
    methods: { ...mountedButtonMethods, ...methodOverrides },
    pressed: false,
    store: {
      addon: createStoreScope(),
      button: createStoreScope(),
    },
    theme: {} as never,
  } as Parameters<NonNullable<typeof definition>['render']>[0]

  return {
    activate: async () => definition?.onActivate?.(props),
    press: async () => definition?.onPress?.(props),
    release: async () => definition?.onRelease?.(props),
    render: () => definition?.render(props),
    tap: async () => definition?.onTap?.(props),
  }
}

describe('media-player addon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getSnapshotMock.mockReset()
    togglePlayPauseMock.mockReset()
    createMediaControllerMock.mockReturnValue({
      getSnapshot: getSnapshotMock,
      togglePlayPause: togglePlayPauseMock,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exports a bundled media-player definition with a bounded schema', () => {
    expect(mediaPlayerAddon.name).toBe('media-player')
    expect(mediaPlayerAddon.apiVersion).toBe(1)
    expect(mediaPlayerAddon.buttons.map((button) => button.type)).toEqual([
      'media-player',
    ])
    expect(mediaPlayerAddon.buttons[0]?.configSchema.parse({})).toEqual({
      poll_interval_ms: 1_000,
      render_interval_ms: 1_000,
    })
  })

  it('loads the bundled media-player through the real registry and renders shared progress plus ellipsis metadata', async () => {
    getSnapshotMock.mockResolvedValue({
      app: 'Spotify',
      artist: 'Massive Attack',
      available: true,
      percentage: 42,
      source: 'linux-playerctl',
      status: 'play',
      title: 'Teardrop',
    })
    togglePlayPauseMock.mockResolvedValue(true)

    const registry = createBundledAddonRegistry()
    const config = validateConfig({
      addons: [],
      decks: {
        main: {
          buttons: [
            {
              hold_command: 'next-track',
              position: 0,
              type: 'media-player',
            },
          ],
          id: 'main',
        },
      },
      main_deck: 'main',
      theme: 'dark',
    }, registry)

    const button = config.decks.main?.buttons[0]
    const harness = createMountedHarness(button?.config)

    await harness.activate()

    const html = renderReactNodeToHtml(harness.render() as never)

    expect(createMediaControllerMock).toHaveBeenCalled()
    expect(html).toContain('data-sireno-ui-bars="true"')
    expect(html).toContain('data-sireno-text-fit="ellipsis"')
    expect(html).toContain('Teardrop')
    expect(html).toContain('Massive Attack')
    expect(html).toContain('Spotify')
    expect(html).toContain('data-sireno-media-status="play"')
  })

  it('degrades honestly when the media controller reports an unsupported host', async () => {
    getSnapshotMock.mockResolvedValue({
      available: false,
      source: 'windows-unsupported',
    })
    togglePlayPauseMock.mockResolvedValue(false)

    const harness = createMountedHarness({ unavailable_label: 'Unavailable' })

    await harness.activate()

    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('Unavailable')
    expect(html).toContain('No active player')
    expect(html).toContain('data-sireno-media-status="unsupported"')
    expect(html).toContain('OFFLINE')
  })

  it('keeps tap fixed to play-pause while hold stays optional and distinct', async () => {
    getSnapshotMock.mockResolvedValue({
      app: 'Spotify',
      artist: 'Massive Attack',
      available: true,
      percentage: 42,
      source: 'linux-playerctl',
      status: 'pause',
      title: 'Teardrop',
    })
    togglePlayPauseMock.mockResolvedValue(true)

    const runCommand = vi.fn(async () => ({ code: 0, failed: false, signal: undefined, stderr: '', stdout: '', timedOut: false }))
    const harness = createMountedHarness({ hold_command: 'next-track' }, { runCommand })

    await harness.activate()
    await harness.press()
    await vi.advanceTimersByTimeAsync(650)
    await harness.release()
    await harness.tap()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual(['next-track'])
    expect(togglePlayPauseMock).not.toHaveBeenCalled()

    runCommand.mockClear()
    togglePlayPauseMock.mockClear()

    await harness.press()
    await vi.advanceTimersByTimeAsync(200)
    await harness.release()
    await harness.tap()

    expect(runCommand).not.toHaveBeenCalled()
    expect(togglePlayPauseMock).toHaveBeenCalledTimes(1)
  })
})
