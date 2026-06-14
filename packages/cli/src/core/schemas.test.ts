import { describe, expect, it } from 'vitest'

import { createBundledAddonRegistry } from '@/config/loader'
import { validateConfig } from './schemas'

const KEY_COUNT = 15

function makeDeck(
  position: number,
  extras: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    addons: [],
    decks: {
      main: {
        buttons: [
          {
            label: 'Test',
            position,
            target_deck: 'subdeck',
            type: 'change-deck',
            ...extras,
          },
        ],
        id: 'main',
        keyCount: KEY_COUNT,
      },
    },
    main_deck: 'main',
    theme: 'dark',
  }
}

function withAllowOverride(
  base: Record<string, unknown>,
  scope: 'root' | 'deck',
): Record<string, unknown> {
  if (scope === 'root') {
    return { ...base }
  }
  return {
    ...base,
    decks: {
      ...(base.decks as Record<string, unknown>),
      main: {
        ...((base.decks as Record<string, unknown>).main as Record<
          string,
          unknown
        >),
      },
    },
  }
}

function withLockDeck(
  base: Record<string, unknown>,
  lockedDeckId = 'locked',
): Record<string, unknown> {
  return {
    ...base,
    decks: {
      ...(base.decks as Record<string, unknown>),
      locked: {
        buttons: [
          {
            label: 'Locked',
            position: KEY_COUNT - 1,
            target_deck: 'main',
            type: 'change-deck',
          },
        ],
        id: lockedDeckId,
        keyCount: KEY_COUNT,
      },
    },
    main_deck: 'main',
    session: { locked_deck: lockedDeckId },
  }
}

describe('reserved slot validation', () => {
  it('rejects a button at the reserved slot (keyCount - 1) on a normal deck', () => {
    const registry = createBundledAddonRegistry()
    const config = makeDeck(KEY_COUNT - 1)
    expect(() => validateConfig(config, registry)).toThrow(/reserved slot/i)
  })

  it('does not reject a button at the reserved slot on the lock-session deck', () => {
    const registry = createBundledAddonRegistry()
    const config = withLockDeck(makeDeck(0))
    expect(() => validateConfig(config, registry)).not.toThrow()
  })

  it('regression: a config with no button at the reserved slot passes', () => {
    const registry = createBundledAddonRegistry()
    const config = makeDeck(0)
    expect(() => validateConfig(config, registry)).not.toThrow()
  })
})

describe('process_names schema (55-01)', () => {
  it('preserves a user-declared process_names array on a regular deck', () => {
    const registry = createBundledAddonRegistry()
    const config = {
      ...makeDeck(0),
      decks: {
        main: {
          buttons: [],
          id: 'main',
          keyCount: KEY_COUNT,
        },
        code_deck: {
          buttons: [],
          id: 'code_deck',
          keyCount: KEY_COUNT,
          process_names: ['code', 'code-insiders'],
        },
      },
    }
    const result = validateConfig(config, registry)
    expect(result.decks?.code_deck?.process_names).toEqual([
      'code',
      'code-insiders',
    ])
  })

  it('accepts a deck without process_names (backwards compatible)', () => {
    const registry = createBundledAddonRegistry()
    const config = {
      ...makeDeck(0),
      decks: {
        main: {
          buttons: [],
          id: 'main',
          keyCount: KEY_COUNT,
        },
        plain_deck: {
          buttons: [],
          id: 'plain_deck',
          keyCount: KEY_COUNT,
        },
      },
    }
    const result = validateConfig(config, registry)
    expect(result.decks?.plain_deck?.process_names).toBeUndefined()
  })

  it('rejects an empty process_names string', () => {
    const registry = createBundledAddonRegistry()
    const config = {
      ...makeDeck(0),
      decks: {
        main: {
          buttons: [],
          id: 'main',
          keyCount: KEY_COUNT,
        },
        bad_deck: {
          buttons: [],
          id: 'bad_deck',
          keyCount: KEY_COUNT,
          process_names: [''],
        },
      },
    }
    expect(() => validateConfig(config, registry)).toThrow()
  })
})

describe('system flag (55-01)', () => {
  it('drops a user-declared system: true from the deck (no user opt-in)', () => {
    const registry = createBundledAddonRegistry()
    const config = {
      ...makeDeck(0),
      decks: {
        main: {
          buttons: [],
          id: 'main',
          keyCount: KEY_COUNT,
        },
        sneaky_deck: {
          buttons: [],
          id: 'sneaky_deck',
          keyCount: KEY_COUNT,
          system: true,
        },
      },
    }
    const result = validateConfig(config, registry)
    expect(result.decks?.sneaky_deck?.system).toBeUndefined()
  })
})

describe('autoShow schema (62-01)', () => {
  it('preserves autoShow: true on a deck', () => {
    const registry = createBundledAddonRegistry()
    const config = {
      ...makeDeck(0),
      decks: {
        main: {
          buttons: [],
          id: 'main',
          keyCount: KEY_COUNT,
        },
        auto_deck: {
          buttons: [],
          id: 'auto_deck',
          keyCount: KEY_COUNT,
          process_names: ['code'],
          autoShow: true,
        },
      },
    }
    const result = validateConfig(config, registry)
    expect(result.decks?.auto_deck?.autoShow).toBe(true)
  })

  it('preserves autoShow: false on a deck', () => {
    const registry = createBundledAddonRegistry()
    const config = {
      ...makeDeck(0),
      decks: {
        main: {
          buttons: [],
          id: 'main',
          keyCount: KEY_COUNT,
        },
        manual_deck: {
          buttons: [],
          id: 'manual_deck',
          keyCount: KEY_COUNT,
          process_names: ['code'],
          autoShow: false,
        },
      },
    }
    const result = validateConfig(config, registry)
    expect(result.decks?.manual_deck?.autoShow).toBe(false)
  })

  it('accepts a deck without autoShow (defaults to false)', () => {
    const registry = createBundledAddonRegistry()
    const config = {
      ...makeDeck(0),
      decks: {
        main: {
          buttons: [],
          id: 'main',
          keyCount: KEY_COUNT,
        },
        plain_deck: {
          buttons: [],
          id: 'plain_deck',
          keyCount: KEY_COUNT,
        },
      },
    }
    const result = validateConfig(config, registry)
    expect(result.decks?.plain_deck?.autoShow).toBe(false)
  })
})
