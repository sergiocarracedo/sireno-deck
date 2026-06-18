import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { executeCommandMock } = vi.hoisted(() => ({
  executeCommandMock: vi.fn(),
}))

vi.mock('@/action/executor', async () => {
  const actual =
    await vi.importActual<typeof import('@/action/executor')>(
      '@/action/executor',
    )

  return {
    ...actual,
    executeCommand: executeCommandMock,
  }
})

import { renderReactNodeToHtml } from '@/render/dom-host'
import { UNKNOWN_HOST_CONTEXT } from '@/system/host-context'
import valueDisplayAddon from './index'

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
  definition: NonNullable<(typeof valueDisplayAddon.buttons)[number]>,
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

describe('value-display addon', () => {
  beforeEach(() => {
    executeCommandMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports a single value-display button with bounded 1-3 value schema', () => {
    expect(valueDisplayAddon.name).toBe('value-display')
    expect(valueDisplayAddon.apiVersion).toBe(1)
    expect(valueDisplayAddon.buttons.map((b) => b.type)).toEqual([
      'value-display',
    ])

    const def = valueDisplayAddon.buttons[0]
    expect(def).toBeDefined()

    const parsed = def!.configSchema.parse({
      values: [{ command: 'echo hi', label: 'Hi' }],
    })
    expect(parsed).toEqual({
      values: [{ command: 'echo hi', label: 'Hi' }],
      poll_interval_ms: 1_000,
      render_interval_ms: 1_000,
    })

    const four = def!.configSchema.safeParse({
      values: [
        { command: 'echo 1', label: 'A' },
        { command: 'echo 2', label: 'B' },
        { command: 'echo 3', label: 'C' },
        { command: 'echo 4', label: 'D' },
      ],
    })
    expect(four.success).toBe(false)
  })

  it('renders 1-value layout with single layout', async () => {
    executeCommandMock.mockResolvedValue({
      code: 0,
      failed: false,
      stderr: '',
      stdout: '42',
    })

    const def = valueDisplayAddon.buttons[0]!
    const config = def.configSchema.parse({
      values: [{ command: 'echo 42', label: 'CPU' }],
    })
    const harness = createMountedHarness(def, config, 0)
    await harness.activate()
    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('CPU')
    expect(html).toContain('data-sireno-label-value-layout="single"')
  })

  it('renders 2-value layout with double layout', async () => {
    executeCommandMock.mockResolvedValue({
      code: 0,
      failed: false,
      stderr: '',
      stdout: '10',
    })

    const def = valueDisplayAddon.buttons[0]!
    const config = def.configSchema.parse({
      values: [
        { command: 'echo 10', label: 'A' },
        { command: 'echo 20', label: 'B' },
      ],
    })
    const harness = createMountedHarness(def, config, 0)
    await harness.activate()
    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('data-sireno-label-value-layout="double"')
  })

  it('renders 3-value layout with stack layout', async () => {
    executeCommandMock.mockResolvedValue({
      code: 0,
      failed: false,
      stderr: '',
      stdout: '5',
    })

    const def = valueDisplayAddon.buttons[0]!
    const config = def.configSchema.parse({
      values: [
        { command: 'echo 1', label: 'A' },
        { command: 'echo 2', label: 'B' },
        { command: 'echo 3', label: 'C' },
      ],
    })
    const harness = createMountedHarness(def, config, 0)
    await harness.activate()
    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('data-sireno-label-value-layout="stack"')
  })

  it('falls back to N/A when a command fails (command-not-found, non-zero)', async () => {
    executeCommandMock.mockResolvedValue({
      code: 127,
      failed: true,
      stderr: 'not found',
      stdout: '',
    })

    const def = valueDisplayAddon.buttons[0]!
    const config = def.configSchema.parse({
      values: [{ command: 'does-not-exist', label: 'X' }],
    })
    const harness = createMountedHarness(def, config, 0)
    await harness.activate()
    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('N/A')
  })

  it('runs commands in parallel via Promise.all with 5s default timeout', async () => {
    const callOrder: string[] = []

    executeCommandMock.mockImplementation(
      async ({ command, timeoutMs }: { command: string; timeoutMs?: number }) => {
        callOrder.push(`start:${command}`)
        await new Promise((resolve) => setTimeout(resolve, 10))
        callOrder.push(`end:${command}`)
        return { code: 0, failed: false, stderr: '', stdout: 'ok', timeoutMs }
      },
    )

    const def = valueDisplayAddon.buttons[0]!
    const config = def.configSchema.parse({
      values: [
        { command: 'cmd-a', label: 'A' },
        { command: 'cmd-b', label: 'B' },
      ],
    })
    const harness = createMountedHarness(def, config, 0)

    await harness.activate()

    expect(callOrder[0]).toBe('start:cmd-a')
    expect(callOrder[1]).toBe('start:cmd-b')
    expect(executeCommandMock.mock.calls[0]?.[0]?.timeoutMs).toBe(5_000)
  })

  it('honors per-value timeout_ms override', async () => {
    executeCommandMock.mockResolvedValue({
      code: 0,
      failed: false,
      stderr: '',
      stdout: 'ok',
    })

    const def = valueDisplayAddon.buttons[0]!
    const config = def.configSchema.parse({
      values: [{ command: 'slow-cmd', label: 'S', timeout_ms: 1234 }],
    })
    const harness = createMountedHarness(def, config, 0)

    await harness.activate()

    expect(executeCommandMock.mock.calls[0]?.[0]?.timeoutMs).toBe(1234)
  })

  it('forwards commands.tap to the button-action-command hook', async () => {
    executeCommandMock.mockResolvedValue({
      code: 0,
      failed: false,
      stderr: '',
      stdout: '5',
    })

    const runCommand = vi.fn(async () => ({
      code: 0,
      failed: false,
      signal: undefined,
      stderr: '',
      stdout: '',
      timedOut: false,
    }))

    const def = valueDisplayAddon.buttons[0]!
    const config = def.configSchema.parse({
      values: [{ command: 'echo 5', label: 'X' }],
      commands: { tap: 'echo tapped' },
    })
    const harness = createMountedHarness(def, config, 0, { runCommand })

    await harness.tap()

    expect(runCommand).toHaveBeenCalledWith('echo tapped')
  })
})