import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Text } from '@/index'
import { renderReactNodeToHtml } from '@/render/dom-host'
import { UNKNOWN_HOST_CONTEXT } from '@/system/host-context'
import coreButtonsAddon from '../index'

const mountedButtonMethods = {
  getActiveDeckId: () => 'main',
  goBack() {},
  invalidate() {},
  keyMacro: async () => {},
  navigateToDeck() {},
  pasteText: async () => {},
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
  definition: NonNullable<(typeof coreButtonsAddon.buttons)[number]>,
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
    refresh: async () => definition.refresh?.(props),
    render: () => definition.render(props),
    tap: async () => definition.onTap?.(props),
  }
}

describe('core-buttons addon', () => {
  it('exports the component-first Text primitive through the public addon API', () => {
    const html = renderReactNodeToHtml(
      createElement(Text, { fit: 'wrap' }, 'Wrapped Label'),
    )

    expect(html).toContain('Wrapped Label')
    expect(html).toContain('data-sireno-ui-text="true"')
    expect(html).toContain('font-main')
    expect(html).toContain('text-foreground')
  })

  it('exports a bundled action button definition with a zod schema', () => {
    expect(coreButtonsAddon.name).toBe('core-buttons')
    expect(coreButtonsAddon.apiVersion).toBe(1)
    expect(coreButtonsAddon.assets).toHaveProperty('clock.svg')

    const definition = coreButtonsAddon.buttons[0]
    const config = definition?.configSchema.parse({
      commands: { tap: 'date' },
      label: 'Clock',
    })

    expect(definition?.type).toBe('action')
    expect(config).toEqual({ commands: { tap: 'date' }, label: 'Clock' })
  })

  it('creates a renderable action button surface through the mounted contract', () => {
    const definition = coreButtonsAddon.buttons[0]
    const harness = createMountedHarness(definition!, {
      icon: './clock.svg',
      label: 'Clock',
    }, 2)

    expect(harness.render()).toBeTruthy()
  })

  it('renders the bundled action button through the DOM render path', () => {
    const definition = coreButtonsAddon.buttons[0]
    const harness = createMountedHarness(definition!, {
      icon: './clock.svg',
      label: 'Clock',
    }, 2)

    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('Clock')
    expect(html).toContain('data-sireno-ui-text="true"')
    expect(html).toContain('font-main text-primary')
  })

  it('runs the configured tap command for the bundled action button', async () => {
    vi.useFakeTimers()

    try {
      const definition = coreButtonsAddon.buttons[0]
      const runCommand = vi.fn(async () => ({}) as never)
      const harness = createMountedHarness(definition!, {
        commands: { tap: 'date' },
        label: 'Clock',
      }, 2, { runCommand })

      const tapPromise = harness.tap()
      await vi.advanceTimersByTimeAsync(300)
      await tapPromise

      expect(runCommand).toHaveBeenCalledTimes(1)
      expect(runCommand).toHaveBeenCalledWith('date')
    } finally {
      vi.useRealTimers()
    }
  })

  it('runs hold instead of tap on a long press for the bundled action button', async () => {
    const definition = coreButtonsAddon.buttons[0]
    const runCommand = vi.fn(async () => ({}) as never)
    const harness = createMountedHarness(definition!, {
      commands: { hold: 'uptime', tap: 'date' },
      label: 'Clock',
    }, 2, { runCommand })

    await harness.hold()

    expect(runCommand).toHaveBeenCalledTimes(1)
    expect(runCommand).toHaveBeenCalledWith('uptime')
  })

  it('suppresses tap and runs double-tap when both commands are configured', async () => {
    const definition = coreButtonsAddon.buttons[0]
    const runCommand = vi.fn(async () => ({}) as never)
    const harness = createMountedHarness(definition!, {
      commands: { 'double-tap': 'cal', tap: 'date' },
      label: 'Clock',
    }, 2, { runCommand })

    await harness.dblTap()

    expect(runCommand).toHaveBeenCalledTimes(1)
    expect(runCommand).toHaveBeenCalledWith('cal')
  })

  it('stays silent for unmatched action-button gestures when commands are partial', async () => {
    vi.useFakeTimers()

    try {
      const definition = coreButtonsAddon.buttons[0]
      const runCommand = vi.fn(async () => ({}) as never)
      const harness = createMountedHarness(definition!, {
        commands: { 'double-tap': 'cal' },
        label: 'Clock',
      }, 2, { runCommand })

      const tapPromise = harness.tap()
      await vi.advanceTimersByTimeAsync(300)
      await tapPromise

      expect(runCommand).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('navigates with the bundled change-deck button', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'change-deck',
    )
    const navigateToDeck = vi.fn()
    const harness = createMountedHarness(definition!, {
      label: 'Emoji',
      target_deck: 'emoji',
    }, 4, { navigateToDeck })

    await harness.tap()

    expect(navigateToDeck).toHaveBeenCalledWith('emoji')
  })

  it('renders the bundled change-deck button through the DOM render path', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'change-deck',
    )
    const harness = createMountedHarness(definition!, {
      icon: './clock.svg',
      label: 'Emoji',
      target_deck: 'emoji',
    }, 4, { navigateToDeck: vi.fn() })

    expect(renderReactNodeToHtml(harness.render() as never)).toContain('Emoji')
  })

  it('exports a bounded media-sample button for browser-only sampled surfaces', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'media-sample',
    )
    const config = definition?.configSchema.parse({
      label: 'Waves',
      sample_interval_ms: 500,
    })
    const harness = createMountedHarness(definition!, config!, 5)
    const html = renderReactNodeToHtml(harness.render() as never)

    expect(definition?.type).toBe('media-sample')
    expect(config).toEqual({ label: 'Waves', sample_interval_ms: 500 })
    expect(html).toContain('data-sireno-full-surface="true"')
    expect(html).toContain('data-sireno-media-sample-interval-ms="500"')
    expect(html).toContain('Waves')
    expect(html).toContain('px-1.5 pb-1.5 pt-2')
  })

  it('exports a bundled toggle definition with the internal-mode schema', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const config = definition?.configSchema.parse({
      label: 'Desk Lamp',
      mode: 'internal',
      on: { subtitle: 'ON' },
    })

    expect(definition?.type).toBe('toggle')
    expect(config).toEqual({
      initial_state: 'off',
      label: 'Desk Lamp',
      mode: 'internal',
      on: { subtitle: 'ON' },
    })
  })

  it('creates a renderable internal toggle surface through the mounted contract', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const harness = createMountedHarness(definition!, {
        initial_state: 'on',
        label: 'Desk Lamp',
        mode: 'internal',
        on: { subtitle: 'ON' },
      },
      6,
      { invalidate: vi.fn() },
    )

    expect(harness.render()).toMatchObject({
      props: expect.any(Object),
    })
    expect(renderReactNodeToHtml(harness.render() as never)).toContain('Desk Lamp')
  })

  it('toggles internal state and invalidates on tap', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const harness = createMountedHarness(definition!, {
        initial_state: 'off',
        label: 'Desk Lamp',
        mode: 'internal',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
      },
      7,
      { invalidate: vi.fn() },
    )

    expect(renderReactNodeToHtml(harness.render() as never)).toContain('OFF')

    await harness.tap()

    expect(renderReactNodeToHtml(harness.render() as never)).toContain('ON')
  })

  it('keeps get-set toggles pending until the first authoritative read', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const runCommand = vi.fn(async () => ({
      code: 0,
      failed: false,
      stdout: 'on',
      timedOut: false,
    }))
    const harness = createMountedHarness(definition!, {
        get_state_command: 'read-lamp',
        label: 'Desk Lamp',
        mode: 'get-set',
        set_off_command: 'turn-off-lamp',
        set_on_command: 'turn-on-lamp',
      },
      8,
      { invalidate: vi.fn(), runCommand },
    )

    expect(renderReactNodeToHtml(harness.render() as never)).toContain('PENDING')
    expect(runCommand).not.toHaveBeenCalled()
  })

  it('does not mutate persisted command-driven toggle store state during render fallback', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const harness = createMountedHarness(
      definition!,
      {
        get_state_command: 'read-lamp',
        label: 'Desk Lamp',
        mode: 'get-set',
        set_off_command: 'turn-off-lamp',
        set_on_command: 'turn-on-lamp',
      },
      8,
      { invalidate: vi.fn(), runCommand: vi.fn() },
    )

    harness.props.store.button.set({ lastKnownState: 'on' })

    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('PENDING')
    expect(harness.props.store.button.snapshot).toEqual({ lastKnownState: 'on' })
  })

  it('runs authoritative reads and selects the correct get-set write command from last known truth', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const invalidate = vi.fn()
    let stateOutput = 'off'
    const runCommand = vi.fn(async (command: string) => {
      if (command === 'read-lamp') {
        return { code: 0, failed: false, stdout: stateOutput, timedOut: false }
      }

      if (command === 'turn-on-lamp') {
        stateOutput = 'on'
      }

      return { code: 0, failed: false, stdout: '', timedOut: false }
    })
    const harness = createMountedHarness(definition!, {
        get_state_command: 'read-lamp',
        label: 'Desk Lamp',
        mode: 'get-set',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        set_off_command: 'turn-off-lamp',
        set_on_command: 'turn-on-lamp',
      },
      9,
      { invalidate, runCommand },
    )

    await harness.activate()

    expect(runCommand).toHaveBeenCalledWith('read-lamp')
    expect(renderReactNodeToHtml(harness.render() as never)).toContain('Desk Lamp')

    await harness.tap()

    expect(runCommand).toHaveBeenCalledWith('turn-on-lamp')
    expect(runCommand).toHaveBeenLastCalledWith('read-lamp')
    expect(renderReactNodeToHtml(harness.render() as never)).toContain('ON')
  })

  it('preserves the last authoritative truth and shows error on get-set write failure', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const runCommand = vi.fn(async (command: string) => {
      if (command === 'read-lamp') {
        return { code: 0, failed: false, stdout: 'on', timedOut: false }
      }

      return { code: 1, failed: true, stdout: '', timedOut: false }
    })
    const harness = createMountedHarness(definition!, {
        get_state_command: 'read-lamp',
        label: 'Desk Lamp',
        mode: 'get-set',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        set_off_command: 'turn-off-lamp',
        set_on_command: 'turn-on-lamp',
      },
      10,
      { invalidate: vi.fn(), runCommand },
    )

    await harness.activate()
    await harness.tap()

    expect(renderReactNodeToHtml(harness.render() as never)).toContain('ERROR')
  })

  it('reconciles toggle-status writes through status_command instead of local inversion', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    let statusOutput = 'off'
    const runCommand = vi.fn(async (command: string) => {
      if (command === 'read-lamp') {
        return { code: 0, failed: false, stdout: statusOutput, timedOut: false }
      }

      if (command === 'toggle-lamp') {
        statusOutput = 'on'
      }

      return { code: 0, failed: false, stdout: '', timedOut: false }
    })
    const harness = createMountedHarness(definition!, {
        label: 'Desk Lamp',
        mode: 'toggle-status',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        status_command: 'read-lamp',
        toggle_command: 'toggle-lamp',
      },
      11,
      { invalidate: vi.fn(), runCommand },
    )

    await harness.activate()
    await harness.tap()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual([
      'read-lamp',
      'toggle-lamp',
      'read-lamp',
    ])
    expect(renderReactNodeToHtml(harness.render() as never)).toContain('ON')
  })

  it('allows toggle-status taps before the first authoritative read has resolved', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    let statusOutput = 'on'
    const runCommand = vi.fn(async (command: string) => {
      if (command === 'read-lamp') {
        return { code: 0, failed: false, stdout: statusOutput, timedOut: false }
      }

      if (command === 'toggle-lamp') {
        statusOutput = 'off'
      }

      return { code: 0, failed: false, stdout: '', timedOut: false }
    })
    const harness = createMountedHarness(definition!, {
        label: 'Desk Lamp',
        mode: 'toggle-status',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        status_command: 'read-lamp',
        toggle_command: 'toggle-lamp',
      },
      12,
      { invalidate: vi.fn(), runCommand },
    )

    await harness.tap()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual([
      'toggle-lamp',
      'read-lamp',
    ])
    expect(renderReactNodeToHtml(harness.render() as never)).toContain('OFF')
  })

  it('preserves last authoritative truth and shows error when toggle-status reconciliation fails', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    let readCount = 0
    const runCommand = vi.fn(async (command: string) => {
      if (command === 'read-lamp') {
        readCount += 1

        if (readCount === 1) {
          return { code: 0, failed: false, stdout: 'on', timedOut: false }
        }

        return { code: 0, failed: false, stdout: 'unknown', timedOut: false }
      }

      return { code: 0, failed: false, stdout: '', timedOut: false }
    })
    const harness = createMountedHarness(definition!, {
        label: 'Desk Lamp',
        mode: 'toggle-status',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        status_command: 'read-lamp',
        toggle_command: 'toggle-lamp',
      },
      13,
      { invalidate: vi.fn(), runCommand },
    )

    await harness.activate()
    await harness.tap()

    expect(renderReactNodeToHtml(harness.render() as never)).toContain('ERROR')
  })

  it('parses key_macro as a string on the bundled action button', () => {
    const definition = coreButtonsAddon.buttons[0]
    const config = definition?.configSchema.parse({
      key_macro: 'ctrl+c',
      label: 'Copy',
    })

    expect(config).toEqual({ key_macro: 'ctrl+c', label: 'Copy' })
  })

  it('parses key_macro as a per-gesture object on the bundled action button', () => {
    const definition = coreButtonsAddon.buttons[0]
    const config = definition?.configSchema.parse({
      key_macro: { hold: 'ctrl+alt+Delete', tap: 'ctrl+c' },
      label: 'Hotkey',
    })

    expect(config).toEqual({
      key_macro: { hold: 'ctrl+alt+Delete', tap: 'ctrl+c' },
      label: 'Hotkey',
    })
  })

  it('rejects the bundled action button when both commands and key_macro are set', () => {
    const definition = coreButtonsAddon.buttons[0]
    expect(() =>
      definition?.configSchema.parse({
        commands: { tap: 'date' },
        key_macro: 'ctrl+c',
        label: 'Conflict',
      }),
    ).toThrowError(/Cannot set both 'commands' and 'key_macro'/)
  })

  it('emits a key_macro on tap and never falls through to runCommand', async () => {
    const definition = coreButtonsAddon.buttons[0]
    const runCommand = vi.fn(async () => ({}) as never)
    const keyMacro = vi.fn(async () => {})
    const harness = createMountedHarness(definition!, {
      key_macro: 'ctrl+c',
      label: 'Copy',
    }, 14, { keyMacro, runCommand })

    await harness.tap()

    expect(keyMacro).toHaveBeenCalledTimes(1)
    expect(keyMacro).toHaveBeenCalledWith('ctrl+c')
    expect(runCommand).not.toHaveBeenCalled()
  })

  it('emits the gesture-specific key_macro for hold and double-tap', async () => {
    const definition = coreButtonsAddon.buttons[0]
    const keyMacro = vi.fn(async () => {})
    const harness = createMountedHarness(definition!, {
      key_macro: { hold: 'ctrl+alt+Delete', 'double-tap': 'cmd+space', tap: 'ctrl+c' },
      label: 'Hotkey',
    }, 15, { keyMacro })

    await harness.hold()
    expect(keyMacro).toHaveBeenLastCalledWith('ctrl+alt+Delete')

    await harness.dblTap()
    expect(keyMacro).toHaveBeenLastCalledWith('cmd+space')
  })
})
