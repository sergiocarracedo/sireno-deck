import type { KeyMacroStep } from './provider'

const KNOWN_MODIFIERS = new Set([
  'ctrl',
  'control',
  'cmd',
  'command',
  'meta',
  'alt',
  'option',
  'shift',
  'win',
  'super',
])

export class KeyMacroParseError extends Error {
  constructor(
    message: string,
    public readonly token?: string,
  ) {
    super(message)
    this.name = 'KeyMacroParseError'
  }
}

function splitTokens(src: string): string[] {
  return src
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function parseWaitToken(token: string): KeyMacroStep {
  const match = /^wait\s+(\d+(?:\.\d+)?)(ms|s)?$/i.exec(token)
  if (!match) {
    throw new KeyMacroParseError(
      `Invalid wait token '${token}' (expected 'wait <n>ms' or 'wait <n>s')`,
      token,
    )
  }

  const value = Number.parseFloat(match[1] ?? '0')
  const unit = (match[2] ?? 'ms').toLowerCase()
  const delayMs = unit === 's' ? Math.round(value * 1000) : Math.round(value)
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new KeyMacroParseError(`Invalid wait delay in '${token}'`, token)
  }
  return { type: 'wait', delayMs }
}

function parseKeyToken(token: string): KeyMacroStep {
  if (token.includes('+')) {
    const rawParts = token.split('+')
    if (rawParts.some((p) => p.trim().length === 0)) {
      throw new KeyMacroParseError(`Missing key in token '${token}'`, token)
    }
  }
  const parts = token.split('+').map((p) => p.trim()).filter((p) => p.length > 0)
  if (parts.length === 0) {
    throw new KeyMacroParseError('Empty key token', token)
  }

  const last = parts[parts.length - 1] as string
  const modifierParts = parts.slice(0, -1)
  const modifiers: string[] = []
  for (const part of modifierParts) {
    const normalized = part.toLowerCase()
    if (!KNOWN_MODIFIERS.has(normalized)) {
      throw new KeyMacroParseError(
        `Unknown modifier '${part}' in token '${token}'`,
        token,
      )
    }
    modifiers.push(normalized)
  }
  if (last.length === 0) {
    throw new KeyMacroParseError(`Missing key in token '${token}'`, token)
  }
  return { type: 'key', key: last, modifiers }
}

export function parseKeyMacro(src: string): KeyMacroStep[] {
  if (typeof src !== 'string') {
    throw new KeyMacroParseError('Key macro must be a string')
  }
  const tokens = splitTokens(src)
  if (tokens.length === 0) {
    throw new KeyMacroParseError('Key macro is empty')
  }
  return tokens.map((token) => {
    if (/^wait\b/i.test(token)) {
      return parseWaitToken(token)
    }
    return parseKeyToken(token)
  })
}
