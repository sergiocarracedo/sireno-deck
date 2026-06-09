import { describe, expect, it } from 'vitest'

import { KeyMacroParseError, parseKeyMacro } from './parser'

describe('parseKeyMacro', () => {
  it('parses a single key', () => {
    expect(parseKeyMacro('c')).toEqual([{ type: 'key', key: 'c', modifiers: [] }])
  })

  it('parses a modifier + key combination', () => {
    expect(parseKeyMacro('ctrl+c')).toEqual([
      { type: 'key', key: 'c', modifiers: ['ctrl'] },
    ])
  })

  it('parses multiple modifiers in order', () => {
    expect(parseKeyMacro('cmd+shift+alt+Tab')).toEqual([
      { type: 'key', key: 'Tab', modifiers: ['cmd', 'shift', 'alt'] },
    ])
  })

  it('parses comma-separated sequences of keys and waits', () => {
    expect(parseKeyMacro('ctrl+c, wait 200ms, c')).toEqual([
      { type: 'key', key: 'c', modifiers: ['ctrl'] },
      { type: 'wait', delayMs: 200 },
      { type: 'key', key: 'c', modifiers: [] },
    ])
  })

  it('accepts seconds for the wait unit', () => {
    expect(parseKeyMacro('wait 1s')).toEqual([{ type: 'wait', delayMs: 1000 }])
  })

  it('trims surrounding whitespace from tokens', () => {
    expect(parseKeyMacro('  ctrl + c  ,  wait 100ms  ')).toEqual([
      { type: 'key', key: 'c', modifiers: ['ctrl'] },
      { type: 'wait', delayMs: 100 },
    ])
  })

  it('rejects empty input', () => {
    expect(() => parseKeyMacro('   ')).toThrow(KeyMacroParseError)
  })

  it('rejects unknown modifiers', () => {
    expect(() => parseKeyMacro('hyper+a')).toThrowError(/Unknown modifier 'hyper'/)
  })

  it('rejects malformed wait tokens', () => {
    expect(() => parseKeyMacro('wait abc')).toThrowError(/Invalid wait token/)
  })

  it('rejects tokens that are only modifiers with no key', () => {
    expect(() => parseKeyMacro('ctrl+')).toThrowError(/Missing key/)
  })
})
