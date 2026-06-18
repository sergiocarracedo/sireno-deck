import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'
import { builtinMediaMuteButton } from '../../buttons/media-mute'
import { builtinMediaVolumeButton } from '../../buttons/media-volume'

type AnyButton = typeof builtinMediaMuteButton | typeof builtinMediaVolumeButton

function createHarness(button: AnyButton, config: unknown) {
  const buttonStore: {
    snapshot: unknown
    set: (v: unknown) => void
    update: (fn: (current: unknown) => unknown) => void
  } = {
    snapshot: undefined,
    set(v) {
      buttonStore.snapshot = v
    },
    update(fn) {
      buttonStore.snapshot = fn(buttonStore.snapshot)
    },
  }

  const props = {
    button: { position: 0, type: button.type },
    config,
    frameState: 'idle' as const,
    hostContext: {
      os: { type: 'linux', variant: 'ubuntu', version: '24.04' },
      session: { capability: 'supported', state: 'unlocked' },
    },
    methods: { invalidate: () => {} } as never,
    pressed: false,
    store: {
      addon: { snapshot: undefined } as never,
      button: buttonStore as never,
    },
    theme: {} as never,
  } as never

  return {
    activate: async () => button.onActivate?.(props),
    render: () => button.render(props),
    store: buttonStore,
    tap: async () => button.onTap?.(props),
  }
}

describe('media-mute', () => {
  it('renders volume-x icon when muted', () => {
    const button = builtinMediaMuteButton
    const harness = createHarness(button, {})
    harness.store.snapshot = { snapshot: { available: true, muted: true, percentage: 0, source: 'pactl' } }
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('volume-x')
  })

  it('renders volume-2 icon when not muted', () => {
    const button = builtinMediaMuteButton
    const harness = createHarness(button, {})
    harness.store.snapshot = { snapshot: { available: true, muted: false, percentage: 50, source: 'pactl' } }
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('volume-2')
  })
})

describe('media-volume', () => {
  it('renders the polled volume percentage', () => {
    const button = builtinMediaVolumeButton
    const harness = createHarness(button, { variant: 'up' })
    harness.store.snapshot = { snapshot: { available: true, muted: false, percentage: 42, source: 'pactl' } }
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('42%')
  })

  it('renders up arrow for variant: up', () => {
    const button = builtinMediaVolumeButton
    const harness = createHarness(button, { variant: 'up' })
    harness.store.snapshot = { snapshot: { available: true, muted: false, percentage: 50, source: 'pactl' } }
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('▲')
  })

  it('renders down arrow for variant: down', () => {
    const button = builtinMediaVolumeButton
    const harness = createHarness(button, { variant: 'down' })
    harness.store.snapshot = { snapshot: { available: true, muted: false, percentage: 50, source: 'pactl' } }
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('▼')
  })

  it('renders the shared Bars component for the volume progress', () => {
    const button = builtinMediaVolumeButton
    const harness = createHarness(button, { variant: 'up' })
    harness.store.snapshot = { snapshot: { available: true, muted: false, percentage: 75, source: 'pactl' } }
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('data-sireno-ui-bars="true"')
  })

  it('renders the unavailable state when no snapshot is available', () => {
    const button = builtinMediaVolumeButton
    const harness = createHarness(button, { variant: 'up' })
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('0%')
  })
})
