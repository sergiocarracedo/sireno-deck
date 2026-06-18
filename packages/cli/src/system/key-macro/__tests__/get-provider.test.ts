import { describe, expect, it, vi } from 'vitest'

import { getKeyMacroProvider } from './index'
import type { KeyMacroExecutor } from './provider'

function silentLogger() {
  return { warn: vi.fn(), error: vi.fn() }
}

function fakeExecutor(): KeyMacroExecutor & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async run(program) {
      calls.push(program)
      return { code: 0, failed: false }
    },
  }
}

describe('getKeyMacroProvider', () => {
  it('returns a supported provider for darwin', () => {
    const provider = getKeyMacroProvider({
      logger: silentLogger(),
      platform: 'darwin',
      executor: fakeExecutor(),
    })
    expect(provider.supportsKeyMacro).toBe(true)
  })

  it('returns a supported provider for win32', () => {
    const provider = getKeyMacroProvider({
      logger: silentLogger(),
      platform: 'win32',
      executor: fakeExecutor(),
    })
    expect(provider.supportsKeyMacro).toBe(true)
  })

  it('returns a supported provider for linux when not pure Wayland', () => {
    const provider = getKeyMacroProvider({
      logger: silentLogger(),
      platform: 'linux',
      env: {},
      executor: fakeExecutor(),
    })
    expect(provider.supportsKeyMacro).toBe(true)
  })

  it('returns an unsupported provider on pure Wayland', () => {
    const logger = silentLogger()
    const provider = getKeyMacroProvider({
      logger,
      platform: 'linux',
      env: { XDG_SESSION_TYPE: 'wayland' },
      executor: fakeExecutor(),
    })
    expect(provider.supportsKeyMacro).toBe(false)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('returns an unsupported provider for unknown platforms', () => {
    const provider = getKeyMacroProvider({
      logger: silentLogger(),
      platform: 'aix' as NodeJS.Platform,
      executor: fakeExecutor(),
    })
    expect(provider.supportsKeyMacro).toBe(false)
  })

  it('darwin provider emits osascript with a System Events tell block', async () => {
    const executor = fakeExecutor()
    const provider = getKeyMacroProvider({
      logger: silentLogger(),
      platform: 'darwin',
      executor,
    })
    await provider.send([
      { type: 'key', key: 'c', modifiers: ['ctrl'] },
      { type: 'wait', delayMs: 200 },
      { type: 'key', key: 'c', modifiers: [] },
    ])
    expect(executor.calls).toHaveLength(1)
    const program = executor.calls[0] ?? ''
    expect(program).toContain('osascript')
    expect(program).toContain('tell application "System Events"')
    expect(program).toContain('keystroke "c" using {control down}')
    expect(program).toContain('delay 0.200')
    expect(program).toContain('keystroke "c"')
  })

  it('linux provider emits xdotool key with --clearmodifiers', async () => {
    const executor = fakeExecutor()
    const provider = getKeyMacroProvider({
      logger: silentLogger(),
      platform: 'linux',
      env: {},
      executor,
    })
    await provider.send([
      { type: 'key', key: 'c', modifiers: ['ctrl'] },
      { type: 'key', key: 'Tab', modifiers: ['alt'] },
    ])
    expect(executor.calls.length).toBeGreaterThan(0)
    const combined = executor.calls.join('\n')
    expect(combined).toContain('xdotool key --clearmodifiers ctrl+c')
    expect(combined).toContain('alt+Tab')
  })

  it('windows provider emits powershell with Add-Type and SendKeys', async () => {
    const executor = fakeExecutor()
    const provider = getKeyMacroProvider({
      logger: silentLogger(),
      platform: 'win32',
      executor,
    })
    await provider.send([
      { type: 'key', key: 'c', modifiers: ['ctrl'] },
      { type: 'wait', delayMs: 100 },
    ])
    expect(executor.calls).toHaveLength(1)
    const program = executor.calls[0] ?? ''
    expect(program).toContain('powershell.exe')
    expect(program).toContain('Add-Type')
    expect(program).toContain('System.Windows.Forms.SendKeys')
    expect(program).toContain('^c')
    expect(program).toContain('__sirenoSendKeysWait 100')
  })

  it('unsupported provider warns once across multiple sends', async () => {
    const logger = silentLogger()
    const provider = getKeyMacroProvider({
      logger,
      platform: 'aix' as NodeJS.Platform,
      executor: fakeExecutor(),
    })
    await provider.send([{ type: 'key', key: 'c', modifiers: [] }])
    await provider.send([{ type: 'key', key: 'd', modifiers: [] }])
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })
})
