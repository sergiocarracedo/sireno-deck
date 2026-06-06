import { describe, expect, it } from 'vitest'

import type { HostContext } from '../../system/host-context.js'
import {
  getHostHidToolStatus,
  getRequiredHidToolName,
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

describe('emoji-selector os-shims host-availability', () => {
  it('maps the linux OS to the xdotool tool', () => {
    expect(getRequiredHidToolName('linux')).toBe('xdotool')
  })

  it('maps the darwin OS to the osascript tool', () => {
    expect(getRequiredHidToolName('darwin')).toBe('osascript')
  })

  it('maps the win32 OS to the powershell tool', () => {
    expect(getRequiredHidToolName('win32')).toBe('powershell')
  })

  it('returns an empty tool name for unknown OSes', () => {
    expect(getRequiredHidToolName('freebsd')).toBe('')
  })

  it('reports the tool as available when execCheck returns a path', () => {
    const status = getHostHidToolStatus('linux', () => '/usr/bin/xdotool')
    expect(status.available).toBe(true)
    if (!status.available) return
    expect(status.toolName).toBe('xdotool')
  })

  it('reports the tool as unavailable when execCheck returns null', () => {
    const status = getHostHidToolStatus('linux', () => null)
    expect(status.available).toBe(false)
    if (status.available) return
    expect(status.toolName).toBe('xdotool')
    expect(status.reason).toMatch(/xdotool/)
    expect(status.installHint).toMatch(/Install.*xdotool|apt install/)
  })

  it('reports the tool as unavailable for unknown OSes with an install hint', () => {
    const status = getHostHidToolStatus('freebsd', () => null)
    expect(status.available).toBe(false)
    if (status.available) return
    expect(status.toolName).toBe('')
    expect(status.reason).toMatch(/freebsd/)
  })

  it('emits the windows/darwin install hint when the tool is missing on those OSes', () => {
    const win = getHostHidToolStatus('win32', () => null)
    expect(win.available).toBe(false)
    if (win.available) return
    expect(win.installHint).toMatch(/Windows/)

    const darwin = getHostHidToolStatus('darwin', () => null)
    expect(darwin.available).toBe(false)
    if (darwin.available) return
    expect(darwin.installHint).toMatch(/macOS/)
  })
})
