import type { HostContext } from '../../system/host-context.js'

export interface SupportedShimCommand {
  command: string
  kind: 'supported'
  osType: string
}

export interface UnsupportedShimCommand {
  kind: 'unsupported'
  osType: string
  reason: string
}

export type ShimCommandResult = SupportedShimCommand | UnsupportedShimCommand

const LINUX_TYPE_COMMAND = (payload: string): string =>
  `xdotool type --clearmodifiers ${shellQuote(payload)}`

const DARWIN_TYPE_COMMAND = (payload: string): string =>
  `printf '%s' ${shellQuote(payload)} | pbcopy && osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`

const WIN32_TYPE_COMMAND = (payload: string): string =>
  `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText(${powershellQuote(payload)}); [System.Windows.Forms.SendKeys]::SendWait('^v')"`

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

function powershellQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function isUnsupported(osType: string): UnsupportedShimCommand {
  return {
    kind: 'unsupported',
    osType,
    reason: `HID keyboard-stroke shim not implemented for OS '${osType}'. Configure \`select_command\` in the deck config to override.`,
  }
}

function resolveShim(
  osType: string,
  build: (payload: string) => string,
): ShimCommandResult {
  return {
    command: build(osType),
    kind: 'supported',
    osType,
  }
}

export function resolveEmojiTypeCommand(
  payload: string,
  hostContext: Pick<HostContext, 'os'>,
): ShimCommandResult {
  const osType = hostContext.os.type

  if (osType === 'linux') {
    return resolveShim(osType, () => LINUX_TYPE_COMMAND(payload))
  }
  if (osType === 'darwin') {
    return resolveShim(osType, () => DARWIN_TYPE_COMMAND(payload))
  }
  if (osType === 'win32') {
    return resolveShim(osType, () => WIN32_TYPE_COMMAND(payload))
  }
  return isUnsupported(osType)
}

export function resolveEmojiShortcodeCommand(
  payload: string,
  hostContext: Pick<HostContext, 'os'>,
): ShimCommandResult {
  return resolveEmojiTypeCommand(payload, hostContext)
}

export function getShimUnsupportedReason(osType: string): string {
  return `HID keyboard-stroke shim not implemented for OS '${osType}'. Configure \`select_command\` in the deck config to override.`
}
