import { execSync } from 'node:child_process'

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

export type HostHidToolStatus =
  | { available: true; toolName: string }
  | { available: false; installHint: string; reason: string; toolName: string }

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

const REQUIRED_TOOL_BY_OS: Record<string, string> = {
  darwin: 'osascript',
  linux: 'xdotool',
  win32: 'powershell',
}

export function getRequiredHidToolName(osType: string): string {
  return REQUIRED_TOOL_BY_OS[osType] ?? ''
}

function getInstallHint(osType: string, toolName: string): string {
  if (osType === 'linux') {
    return `Install ${toolName} (e.g. \`sudo apt install xdotool\`) or set \`select_command\` in the deck config to override.`
  }
  if (osType === 'darwin' || osType === 'win32') {
    return `${toolName} is built into ${osType === 'darwin' ? 'macOS' : 'Windows'} and should be available on PATH. If not, set \`select_command\` in the deck config to override.`
  }
  return `Install ${toolName} to enable HID keyboard-stroke output, or set \`select_command\` in the deck config to override.`
}

type ExecCheck = (cmd: string) => string | null

const defaultExecCheck: ExecCheck = (cmd) => {
  try {
    const out = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const trimmed = out.trim()
    return trimmed === '' ? null : trimmed
  } catch {
    return null
  }
}

export function getHostHidToolStatus(
  osType: string,
  execCheck: ExecCheck = defaultExecCheck,
): HostHidToolStatus {
  const toolName = getRequiredHidToolName(osType)
  if (toolName === '') {
    return {
      available: false,
      installHint: getInstallHint(osType, toolName),
      reason: `HID keyboard-stroke shim not implemented for OS '${osType}'.`,
      toolName,
    }
  }
  const checkCmd =
    process.platform === 'win32' ? `where ${toolName}` : `command -v ${toolName}`
  const resolvedPath = execCheck(checkCmd)
  if (resolvedPath !== null) {
    return { available: true, toolName }
  }
  return {
    available: false,
    installHint: getInstallHint(osType, toolName),
    reason: `HID tool '${toolName}' is not installed on the host.`,
    toolName,
  }
}
