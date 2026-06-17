import { KeyMacroParseError } from './parser'
import type {
  KeyMacroExecutor,
  KeyMacroProvider,
  KeyMacroProviderDeps,
  KeyMacroStep,
} from './provider'

const SENDKEYS_MODIFIER_MAP: Record<string, string> = {
  ctrl: '^',
  control: '^',
  alt: '%',
  option: '%',
  shift: '+',
  meta: '#',
  cmd: '#',
  command: '#',
  super: '#',
  win: '#',
}

const SENDKEYS_KEY_ALIASES: Record<string, string> = {
  enter: '{ENTER}',
  return: '{ENTER}',
  tab: '{TAB}',
  escape: '{ESC}',
  esc: '{ESC}',
  backspace: '{BS}',
  delete: '{DEL}',
  space: ' ',
  up: '{UP}',
  down: '{DOWN}',
  left: '{LEFT}',
  right: '{RIGHT}',
  f1: '{F1}',
  f2: '{F2}',
  f3: '{F3}',
  f4: '{F4}',
  f5: '{F5}',
  f6: '{F6}',
  f7: '{F7}',
  f8: '{F8}',
  f9: '{F9}',
  f10: '{F10}',
  f11: '{F11}',
  f12: '{F12}',
}

function renderSendKeys(step: Extract<KeyMacroStep, { type: 'key' }>): string {
  const unknown = step.modifiers.find((m) => !(m in SENDKEYS_MODIFIER_MAP))
  if (unknown) {
    throw new KeyMacroParseError(
      `Unsupported modifier '${unknown}' for Windows key-macro`,
      unknown,
    )
  }
  const modifierPrefix = step.modifiers
    .map((m) => SENDKEYS_MODIFIER_MAP[m] as string)
    .join('')
  const lowered = step.key.toLowerCase()
  const alias = SENDKEYS_KEY_ALIASES[lowered]
  let keyToken: string
  if (alias) {
    keyToken = alias
  } else if (step.key.length === 1) {
    const ch = step.key
    const needsBraces = /[+^%~(){}[\]]/.test(ch)
    keyToken = needsBraces ? `{${ch}}` : ch
  } else {
    keyToken = `{${step.key}}`
  }
  return `${modifierPrefix}${keyToken}`
}

const LOAD_SENDKEYS_SCRIPT = [
  '$ErrorActionPreference = "Stop"',
  'Add-Type -AssemblyName System.Windows.Forms',
  '$__sirenoSendKeys = [System.Windows.Forms.SendKeys]',
  'function __sirenoSendKeysWait { param($ms) Start-Sleep -Milliseconds $ms }',
  'function __sirenoSendKeysSend { param($text) $__sirenoSendKeys::SendWait($text) }',
].join('\n')

function buildPowerShellScript(steps: readonly KeyMacroStep[]): string {
  const lines: string[] = [LOAD_SENDKEYS_SCRIPT]
  for (const step of steps) {
    if (step.type === 'wait') {
      lines.push(`__sirenoSendKeysWait ${step.delayMs}`)
      continue
    }
    lines.push(
      `__sirenoSendKeysSend ${psSingleQuote(renderSendKeys(step))}`,
    )
  }
  return lines.join('\n')
}

function psSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

export interface CreateWindowsProviderOptions extends KeyMacroProviderDeps {
  executor: KeyMacroExecutor
  powershellPath?: string
}

export function createWindowsKeyMacroProvider(
  options: CreateWindowsProviderOptions,
): KeyMacroProvider {
  const ps = options.powershellPath ?? 'powershell.exe'
  return {
    supportsKeyMacro: true,
    async send(sequence) {
      const script = buildPowerShellScript(sequence)
      const result = await options.executor.run(
        `${ps} -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ${shellSingleQuote(script)}`,
      )
      if (result.failed) {
        throw new Error(
          `key-macro: powershell failed (exit code: ${result.code})`,
        )
      }
    },
  }
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}
