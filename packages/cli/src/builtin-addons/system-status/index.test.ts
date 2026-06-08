import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { getCanonicalSystemMetricsMock } = vi.hoisted(() => ({
  getCanonicalSystemMetricsMock: vi.fn(),
}))

vi.mock('./domain/live-metrics', async () => {
  const actual = await vi.importActual<typeof import('./domain/live-metrics')>(
    './domain/live-metrics',
  )

  return {
    ...actual,
    getCanonicalSystemMetrics: getCanonicalSystemMetricsMock,
  }
})

import { createBundledAddonRegistry } from '@/config/loader'
import { validateConfig } from '@/core/schemas'
import { renderReactNodeToHtml } from '@/render/dom-host'
import { UNKNOWN_HOST_CONTEXT } from '@/system/host-context'
import systemStatusAddon from './index'

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
  definition: NonNullable<(typeof systemStatusAddon.buttons)[number]>,
  config: unknown,
  position: number,
  methodOverrides: Partial<typeof mountedButtonMethods> = {},
) {
  const props = {
    button: { position, type: definition.type },
    config,
    frameState: 'idle',
    hostContext: UNKNOWN_HOST_CONTEXT,
    methods: { ...mountedButtonMethods, ...methodOverrides },
    pressed: false,
    store: {
      addon: createStoreScope(),
      button: createStoreScope(),
    },
    theme: {} as never,
  } as Parameters<typeof definition.render>[0]

  return {
    activate: async () => definition.onActivate?.(props),
    dblTap: async () => definition.onDblTap?.(props),
    hold: async () => definition.onHold?.(props),
    press: async () => {},
    props,
    release: async () => {},
    render: () => definition.render(props),
    tap: async () => definition.onTap?.(props),
  }
}

describe('system-status addon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getCanonicalSystemMetricsMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exports bundled bars and label-value definitions with bounded schemas', () => {
    expect(systemStatusAddon.name).toBe('system-status')
    expect(systemStatusAddon.apiVersion).toBe(1)
    expect(systemStatusAddon.buttons.map((button) => button.type)).toEqual([
      'system-status-bars',
      'system-status-label-values',
    ])

    const barsDefinition = systemStatusAddon.buttons[0]
    const labelValuesDefinition = systemStatusAddon.buttons[1]

    expect(barsDefinition?.configSchema.parse({
      metrics: [{ metric: 'cpu_usage' }],
    })).toEqual({
      metrics: [{ metric: 'cpu_usage' }],
      poll_interval_ms: 1_000,
      render_interval_ms: 1_000,
    })
    expect(labelValuesDefinition?.configSchema.parse({
      commands: { tap: 'date' },
      metrics: [{ label: 'CPU', metric: 'cpu_usage' }, { metric: 'fan_speed' }],
    })).toEqual({
      commands: { tap: 'date' },
      metrics: [{ label: 'CPU', metric: 'cpu_usage' }, { metric: 'fan_speed' }],
      poll_interval_ms: 1_000,
      render_interval_ms: 1_000,
    })
  })

  it('loads bundled label-value buttons through the real registry and config path with explicit unavailable slots', async () => {
    getCanonicalSystemMetricsMock.mockResolvedValue([
      {
        available: true,
        id: 'cpu_usage',
        label: '45%',
        max: 100,
        percentage: 45,
        unit: '%',
        value: 45,
      },
      {
        available: false,
        id: 'fan_speed',
        label: 'Unavailable',
        unit: 'rpm',
      },
    ])

    const registry = createBundledAddonRegistry()
    const config = validateConfig({
      addons: [],
      decks: {
        main: {
          buttons: [
            {
              metrics: [
                { icon: 'sparkles', label: 'CPU', metric: 'cpu_usage' },
                { label: 'Fan', metric: 'fan_speed', unavailable_label: 'N/A' },
              ],
              position: 0,
              type: 'system-status-label-values',
            },
          ],
          id: 'main',
        },
      },
      main_deck: 'main',
      theme: 'dark',
    }, registry)

    const button = config.decks.main?.buttons[0]
    const definition = registry.getButton('system-status-label-values')
    const harness = createMountedHarness(definition!, button?.config, 0)

    await harness.activate()

    const html = renderReactNodeToHtml(harness.render() as never)

    expect(getCanonicalSystemMetricsMock).toHaveBeenCalledWith([
      'cpu_usage',
      'fan_speed',
    ])
    expect(html).toContain('data-sireno-ui-label-value-list="true"')
    expect(html).toContain('CPU')
    expect(html).toContain('45%')
    expect(html).toContain('Fan')
    expect(html).toContain('N/A')
  })

  it('renders bars buttons with explicit unavailable footer slots instead of hiding them', async () => {
    getCanonicalSystemMetricsMock.mockResolvedValue([
      {
        available: true,
        id: 'cpu_usage',
        label: '45%',
        max: 100,
        percentage: 45,
        unit: '%',
        value: 45,
      },
      {
        available: false,
        id: 'swap_usage',
        label: 'Unavailable',
        unit: 'B',
      },
    ])

    const definition = systemStatusAddon.buttons.find(
      (button) => button.type === 'system-status-bars',
    )
    const harness = createMountedHarness(definition!, {
      metrics: [
        { label: 'CPU', metric: 'cpu_usage' },
        { label: 'Swap', metric: 'swap_usage', unavailable_label: 'N/A' },
      ],
    }, 1)

    await harness.activate()

    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('data-sireno-ui-bars="true"')
    expect(html).toContain('CPU')
    expect(html).toContain('Swap')
    expect(html).toContain('45%')
    expect(html).toContain('N/A')
  })

  it('renders formatted metric values inside each bar (no separate value grid)', async () => {
    getCanonicalSystemMetricsMock.mockResolvedValue([
      {
        available: true,
        id: 'cpu_usage',
        label: '45%',
        max: 100,
        percentage: 45,
        unit: '%',
        value: 45,
      },
      {
        available: true,
        id: 'mem_usage',
        label: '12.3 GB',
        max: 32,
        unit: 'GB',
        value: 12.3,
      },
    ])

    const definition = systemStatusAddon.buttons.find(
      (button) => button.type === 'system-status-bars',
    )
    const harness = createMountedHarness(definition!, {
      metrics: [
        { label: 'CPU', metric: 'cpu_usage' },
        { label: 'MEM', metric: 'mem_usage' },
      ],
    }, 2)

    await harness.activate()

    const html = renderReactNodeToHtml(harness.render() as never)

    // The formatted values appear inside the bars via the sireno-bars-value class.
    // The separate value grid below the bars is gone (no repeat(2, minmax(0, 1fr))).
    const valueElements = html.match(/sireno-bars-value[^>]*>[^<]*(?:45%|12\.3 GB)/g) ?? []
    expect(valueElements.length).toBeGreaterThanOrEqual(2)
    expect(html).not.toContain('repeat(2, minmax(0, 1fr))')
    expect(html).toContain('transform:rotate(-90deg)')
  })

  it('keeps tap and hold commands distinct through the shared command hook', async () => {
    getCanonicalSystemMetricsMock.mockResolvedValue([
      {
        available: true,
        id: 'cpu_usage',
        label: '45%',
        max: 100,
        percentage: 45,
        unit: '%',
        value: 45,
      },
    ])

    const definition = systemStatusAddon.buttons.find(
      (button) => button.type === 'system-status-label-values',
    )
    const runCommand = vi.fn(async () => ({ code: 0, failed: false, signal: undefined, stderr: '', stdout: '', timedOut: false }))
    const harness = createMountedHarness(definition!, {
      commands: { hold: 'hold-cpu', tap: 'tap-cpu' },
      metrics: [{ metric: 'cpu_usage' }],
    }, 2, { runCommand })

    await harness.activate()
    await harness.hold()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual(['hold-cpu'])

    runCommand.mockClear()

    await harness.tap()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual(['tap-cpu'])
  })

  it('suppresses tap and runs double-tap for system-status buttons with both commands configured', async () => {
    getCanonicalSystemMetricsMock.mockResolvedValue([
      {
        available: true,
        id: 'cpu_usage',
        label: '45%',
        max: 100,
        percentage: 45,
        unit: '%',
        value: 45,
      },
    ])

    const definition = systemStatusAddon.buttons.find(
      (button) => button.type === 'system-status-bars',
    )
    const runCommand = vi.fn(async () => ({ code: 0, failed: false, signal: undefined, stderr: '', stdout: '', timedOut: false }))
    const harness = createMountedHarness(definition!, {
      commands: { 'double-tap': 'double-cpu', tap: 'tap-cpu' },
      metrics: [{ metric: 'cpu_usage' }],
    }, 3, { runCommand })

    await harness.activate()

    await harness.dblTap()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual(['double-cpu'])
  })
})
