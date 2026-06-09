import { KeyMacroParseError } from './parser'
import type {
  KeyMacroExecutor,
  KeyMacroProvider,
  KeyMacroProviderDeps,
  KeyMacroStep,
} from './provider'

const SPECIAL_KEY_CODES: Record<string, number> = {
  enter: 36,
  return: 36,
  tab: 48,
  space: 49,
  delete: 51,
  backspace: 51,
  escape: 53,
  esc: 53,
  left: 123,
  right: 124,
  down: 125,
  up: 126,
  f1: 122,
  f2: 120,
  f3: 99,
  f4: 118,
  f5: 96,
  f6: 97,
  f7: 98,
  f8: 100,
  f9: 101,
  f10: 109,
  f11: 103,
  f12: 111,
}

function normalizeDarwinModifier(modifier: string): string | null {
  switch (modifier) {
    case 'cmd':
    case 'command':
    case 'meta':
      return 'command'
    case 'ctrl':
    case 'control':
      return 'control'
    case 'alt':
    case 'option':
      return 'option'
    case 'shift':
      return 'shift'
    default:
      return null
  }
}

function escapeAppleScriptString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

function renderKeyStep(step: Extract<KeyMacroStep, { type: 'key' }>): string {
  const darwinModifiers = step.modifiers
    .map(normalizeDarwinModifier)
    .filter((m): m is string => m !== null)

  if (darwinModifiers.length !== step.modifiers.length) {
    const invalid = step.modifiers.find((m) => normalizeDarwinModifier(m) === null)
    throw new KeyMacroParseError(
      `Unsupported modifier '${invalid}' for macOS key-macro`,
      invalid,
    )
  }

  const key = step.key.length === 1 ? step.key.toLowerCase() : step.key.toLowerCase()
  const code = SPECIAL_KEY_CODES[key]

  if (darwinModifiers.length === 0) {
    if (code !== undefined) {
      return `key code ${code}`
    }
    return `keystroke "${escapeAppleScriptString(step.key)}"`
  }

  const usingClause = `using {${darwinModifiers.map((m) => `${m} down`).join(', ')}}`
  if (code !== undefined) {
    return `key code ${code} ${usingClause}`
  }
  return `keystroke "${escapeAppleScriptString(step.key)}" ${usingClause}`
}

function buildScript(steps: readonly KeyMacroStep[]): string {
  const lines: string[] = ['tell application "System Events"']
  for (const step of steps) {
    if (step.type === 'wait') {
      lines.push(`  delay ${(step.delayMs / 1000).toFixed(3)}`)
      continue
    }
    lines.push(`  ${renderKeyStep(step)}`)
  }
  lines.push('end tell')
  return lines.join('\n')
}

export interface CreateDarwinProviderOptions extends KeyMacroProviderDeps {
  executor: KeyMacroExecutor
}

export function createDarwinKeyMacroProvider(
  options: CreateDarwinProviderOptions,
): KeyMacroProvider {
  return {
    supportsKeyMacro: true,
    async send(sequence) {
      const script = buildScript(sequence)
      const result = await options.executor.run(
        `/usr/bin/osascript -e ${shellSingleQuote(script)}`,
      )
      if (result.failed) {
        options.deps.logger.warn(
          { script },
          'key-macro: osascript returned non-zero exit',
        )
      }
    },
  }
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}
