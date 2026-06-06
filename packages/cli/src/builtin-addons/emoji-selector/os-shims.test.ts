import { describe, expect, it } from 'vitest'

import type { HostContext } from '../../system/host-context.js'
import {
  getShimUnsupportedReason,
  resolveEmojiShortcodeCommand,
  resolveEmojiTypeCommand,
} from './os-shims.js'

function hostWithOsType(osType: string): Pick<HostContext, 'os'> {
  return {
    os: {
      type: osType,
      variant: 'unknown',
      version: '0.0.0',
    },
  }
}

describe('emoji-selector os-shims', () => {
  it('resolves the xdotool command for linux tap', () => {
    const result = resolveEmojiTypeCommand('🔥', hostWithOsType('linux'))
    expect(result.kind).toBe('supported')
    if (result.kind !== 'supported') return
    expect(result.osType).toBe('linux')
    expect(result.command).toBe("xdotool type --clearmodifiers '🔥'")
  })

  it('resolves the pbcopy + osascript chain for darwin tap', () => {
    const result = resolveEmojiTypeCommand('🔥', hostWithOsType('darwin'))
    expect(result.kind).toBe('supported')
    if (result.kind !== 'supported') return
    expect(result.osType).toBe('darwin')
    expect(result.command).toBe(
      `printf '%s' '🔥' | pbcopy && osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`,
    )
  })

  it('resolves the PowerShell Set-Clipboard + SendKeys snippet for win32 tap', () => {
    const result = resolveEmojiTypeCommand('🔥', hostWithOsType('win32'))
    expect(result.kind).toBe('supported')
    if (result.kind !== 'supported') return
    expect(result.osType).toBe('win32')
    expect(result.command).toBe(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText('🔥'); [System.Windows.Forms.SendKeys]::SendWait('^v')"`,
    )
  })

  it('returns an unsupported marker for unknown OSes', () => {
    const result = resolveEmojiTypeCommand('🔥', hostWithOsType('freebsd'))
    expect(result.kind).toBe('unsupported')
    if (result.kind !== 'unsupported') return
    expect(result.osType).toBe('freebsd')
    expect(result.reason).toMatch(/freebsd/)
  })

  it('escapes single quotes in the linux payload', () => {
    const result = resolveEmojiTypeCommand("it's", hostWithOsType('linux'))
    expect(result.kind).toBe('supported')
    if (result.kind !== 'supported') return
    expect(result.command).toBe(`xdotool type --clearmodifiers 'it'"'"'s'`)
  })

  it('escapes single quotes in the darwin payload', () => {
    const result = resolveEmojiTypeCommand("it's", hostWithOsType('darwin'))
    expect(result.kind).toBe('supported')
    if (result.kind !== 'supported') return
    expect(result.command).toContain(`'it'"'"'s'`)
  })

  it('escapes single quotes in the win32 payload', () => {
    const result = resolveEmojiTypeCommand("it's", hostWithOsType('win32'))
    expect(result.kind).toBe('supported')
    if (result.kind !== 'supported') return
    expect(result.command).toContain(`'it''s'`)
  })

  it('shortcode path uses the same shim as the type path', () => {
    const type = resolveEmojiTypeCommand(':fire:', hostWithOsType('linux'))
    const shortcode = resolveEmojiShortcodeCommand(
      ':fire:',
      hostWithOsType('linux'),
    )
    expect(type).toEqual(shortcode)
  })

  it('getShimUnsupportedReason returns a human-readable string', () => {
    expect(getShimUnsupportedReason('freebsd')).toMatch(/freebsd/)
  })
})
