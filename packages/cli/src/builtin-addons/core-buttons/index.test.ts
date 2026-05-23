import { describe, expect, it, vi } from 'vitest'

import { createBaseShapeTextContent } from '../../addon/api.js'
import { renderReactNodeToHtml } from '../../render/dom-host.js'
import coreButtonsAddon from './index.js'

describe('core-buttons addon', () => {
  it('exports the remaining explicit base-shape content helper through the public addon API', () => {
    expect(renderReactNodeToHtml(createBaseShapeTextContent({ fit: 'wrap', keyIndex: 3, label: 'Wrapped Label' }))).toContain('Wrapped Label')
  })

  it('exports a bundled action button definition with a zod schema', () => {
    expect(coreButtonsAddon.name).toBe('core-buttons')
    expect(coreButtonsAddon.apiVersion).toBe(1)
    expect(coreButtonsAddon.assets).toHaveProperty('clock.svg')

    const definition = coreButtonsAddon.buttons[0]
    const config = definition?.configSchema.parse({ label: 'Clock' })

    expect(definition?.type).toBe('action')
    expect(config).toEqual({ label: 'Clock' })
  })

  it('creates a renderable button instance', () => {
    const definition = coreButtonsAddon.buttons[0]
    const instance = definition?.createInstance({
      button: { position: 2 },
      config: { icon: './clock.svg', label: 'Clock' },
    })

    expect(instance?.render()).toBeTruthy()
  })

  it('renders the bundled action button through the DOM render path', () => {
    const definition = coreButtonsAddon.buttons[0]
    const instance = definition?.createInstance({
      button: { position: 2 },
      config: { icon: './clock.svg', label: 'Clock' },
    } as never)

    const html = renderReactNodeToHtml(instance?.render() as never)

    expect(html).toContain('Clock')
    expect(html).toContain('class="bg-background border-accent"')
    expect(html).toContain('class="font-main text-primary"')
  })

  it('navigates with the bundled change-deck button', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'change-deck',
    )
    const navigateToDeck = vi.fn()
    const instance = definition?.createInstance({
      button: { position: 4 },
      config: { label: 'Emoji', target_deck: 'emoji' },
      methods: { navigateToDeck },
    } as never)

    await instance?.onTap?.()

    expect(navigateToDeck).toHaveBeenCalledWith('emoji')
  })

  it('renders the bundled change-deck button through the DOM render path', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'change-deck',
    )
    const instance = definition?.createInstance({
      button: { position: 4 },
      config: { icon: './clock.svg', label: 'Emoji', target_deck: 'emoji' },
      methods: { navigateToDeck: vi.fn() },
    } as never)

    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('Emoji')
  })

  it('exports a bounded media-sample button for browser-only sampled surfaces', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'media-sample',
    )
    const config = definition?.configSchema.parse({
      label: 'Waves',
      sample_interval_ms: 500,
    })
    const instance = definition?.createInstance({
      button: { position: 5 },
      config: config!,
    } as never)
    const html = renderReactNodeToHtml(instance?.render() as never)

    expect(definition?.type).toBe('media-sample')
    expect(config).toEqual({ label: 'Waves', sample_interval_ms: 500 })
    expect(html).toContain('data-sireno-full-surface="true"')
    expect(html).toContain('data-sireno-media-sample-interval-ms="500"')
    expect(html).toContain('Waves')
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

  it('creates a renderable internal toggle instance', () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const instance = definition?.createInstance({
      button: { position: 6 },
      config: {
        initial_state: 'on',
        label: 'Desk Lamp',
        mode: 'internal',
        on: { subtitle: 'ON' },
      },
      methods: { invalidate: vi.fn() },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: expect.any(Object),
    })
    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('Desk Lamp')
  })

  it('toggles internal state and invalidates on tap', async () => {
    const definition = coreButtonsAddon.buttons.find(
      (button) => button.type === 'toggle',
    )
    const invalidate = vi.fn()
    const instance = definition?.createInstance({
      button: { position: 7 },
      config: {
        initial_state: 'off',
        label: 'Desk Lamp',
        mode: 'internal',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
      },
      methods: { invalidate },
    } as never)

    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('Desk Lamp')

    await instance?.onTap?.()

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('Desk Lamp')
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
    const instance = definition?.createInstance({
      button: { position: 8 },
      config: {
        get_state_command: 'read-lamp',
        label: 'Desk Lamp',
        mode: 'get-set',
        set_off_command: 'turn-off-lamp',
        set_on_command: 'turn-on-lamp',
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('PENDING')
    expect(runCommand).not.toHaveBeenCalled()
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
    const instance = definition?.createInstance({
      button: { position: 9 },
      config: {
        get_state_command: 'read-lamp',
        label: 'Desk Lamp',
        mode: 'get-set',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        set_off_command: 'turn-off-lamp',
        set_on_command: 'turn-on-lamp',
      },
      methods: { invalidate, runCommand },
    } as never)

    await instance?.onActivate?.()

    expect(runCommand).toHaveBeenCalledWith('read-lamp')
    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('Desk Lamp')

    await instance?.onTap?.()

    expect(runCommand).toHaveBeenCalledWith('turn-on-lamp')
    expect(runCommand).toHaveBeenLastCalledWith('read-lamp')
    expect(invalidate).toHaveBeenCalled()
    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('Desk Lamp')
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
    const instance = definition?.createInstance({
      button: { position: 10 },
      config: {
        get_state_command: 'read-lamp',
        label: 'Desk Lamp',
        mode: 'get-set',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        set_off_command: 'turn-off-lamp',
        set_on_command: 'turn-on-lamp',
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    await instance?.onActivate?.()
    await instance?.onTap?.()

    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('ERROR')
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
    const instance = definition?.createInstance({
      button: { position: 11 },
      config: {
        label: 'Desk Lamp',
        mode: 'toggle-status',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        status_command: 'read-lamp',
        toggle_command: 'toggle-lamp',
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    await instance?.onActivate?.()
    await instance?.onTap?.()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual([
      'read-lamp',
      'toggle-lamp',
      'read-lamp',
    ])
    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('Desk Lamp')
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
    const instance = definition?.createInstance({
      button: { position: 12 },
      config: {
        label: 'Desk Lamp',
        mode: 'toggle-status',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        status_command: 'read-lamp',
        toggle_command: 'toggle-lamp',
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    await instance?.onTap?.()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual([
      'toggle-lamp',
      'read-lamp',
    ])
    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('Desk Lamp')
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
    const instance = definition?.createInstance({
      button: { position: 13 },
      config: {
        label: 'Desk Lamp',
        mode: 'toggle-status',
        off: { subtitle: 'OFF' },
        on: { subtitle: 'ON' },
        status_command: 'read-lamp',
        toggle_command: 'toggle-lamp',
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    await instance?.onActivate?.()
    await instance?.onTap?.()

    expect(renderReactNodeToHtml(instance?.render() as never)).toContain('ERROR')
  })
})
