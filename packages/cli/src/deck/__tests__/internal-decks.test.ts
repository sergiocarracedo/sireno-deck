import { describe, expect, it } from 'vitest'

import { createDeckRuntime } from '../runtime'
import { createAddonRegistry } from '@/addon/registry'
import type { DeckConfig } from '@/core/schemas'

const KEY_COUNT = 15

function makeTestDeck(overrides: Partial<DeckConfig> = {}): DeckConfig {
  return {
    buttons: [],
    id: 'main',
    ...overrides,
  }
}

function makeUserSettingsDeck(): DeckConfig {
  return {
    buttons: [],
    id: 'settings',
  }
}

function makeMinimalTheme() {
  return {
    filePaths: [],
    tokens: {
      accent: '#fff',
      auxiliary_text: { color: '#888', font: {} },
      background: '#000',
      main_text: { color: '#fff', font: {} },
      monospace: { color: '#fff', font: {} },
    },
  } as never
}

function makeRuntime(overrides: {
  decks?: Record<string, DeckConfig>
  lockedDeckId?: string
}) {
  const main = makeTestDeck()
  return createDeckRuntime({
    addonRegistry: createAddonRegistry(),
    deck: main,
    decks: overrides.decks ?? { main },
    hostContext: {
      os: { type: 'linux', variant: 'ubuntu', version: '24.04' },
      session: { capability: 'supported', state: 'unlocked' },
    },
    keyCount: KEY_COUNT,
    ...(overrides.lockedDeckId !== undefined
      ? { lockedDeckId: overrides.lockedDeckId }
      : {}),
    subscribeKeyEvents: () => () => {},
    theme: makeMinimalTheme(),
  })
}

describe('INTERNAL_DECKS id-priority shadowing (55-01)', () => {
  it('internal settings deck shadows a user-defined settings deck on navigate', () => {
    const runtime = makeRuntime({
      decks: { main: makeTestDeck(), settings: makeUserSettingsDeck() },
    })

    runtime.restoreStack(['settings'])
    const active = runtime.getActiveDeck()
    expect(active.id).toBe('settings')
    expect(active.system).toBe(true)
    expect(active.buttons.length).toBe(4)
    expect(active.buttons.every((b) => b.type === 'settings-placeholder')).toBe(
      true,
    )
  })

  it('user-defined locked_deck is preferred over the internal one when named via lockedDeckId', () => {
    const runtime = makeRuntime({
      decks: {
        main: makeTestDeck(),
        'user-locked-deck': {
          buttons: [],
          id: 'user-locked-deck',
        },
      },
      lockedDeckId: 'user-locked-deck',
    })

    runtime.restoreStack(['user-locked-deck'])
    const active = runtime.getActiveDeck()
    expect(active.id).toBe('user-locked-deck')
    expect(active.system).toBeUndefined()
  })

  it('internal locked deck is activatable when no user override is provided', () => {
    const runtime = makeRuntime({ decks: { main: makeTestDeck() } })

    runtime.restoreStack(['__sireno_locked_session__'])
    const active = runtime.getActiveDeck()
    expect(active.id).toBe('__sireno_locked_session__')
    expect(active.system).toBe(true)
    expect(active.buttons.length).toBe(5)
    expect(active.buttons.every((b) => b.type === 'locked-time-tile')).toBe(
      true,
    )
  })
})
