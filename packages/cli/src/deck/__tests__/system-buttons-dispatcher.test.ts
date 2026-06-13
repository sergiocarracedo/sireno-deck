import { describe, expect, it } from 'vitest'

import { createDeckRuntime } from '../runtime'
import { createAddonRegistry } from '@/addon/registry'
import {
  getLastPositionSystemButton,
  OVERLAY_TOGGLE_TYPE,
  SYSTEM_BACK_WITH_PENDING_OVERLAY_TYPE,
  SYSTEM_SETTINGS_TYPE,
} from '../system-buttons/system-buttons'
import { SYSTEM_BACK_TYPE } from '../system-back-injection'
import type { DeckConfig } from '@/core/schemas'

const KEY_COUNT = 15

function makeDeck(overrides: Partial<DeckConfig> = {}): DeckConfig {
  return {
    buttons: [],
    id: 'main',
    ...overrides,
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

function makeRuntime() {
  const main = makeDeck()
  return createDeckRuntime({
    addonRegistry: createAddonRegistry(),
    deck: main,
    decks: { main },
    hostContext: {
      os: { type: 'linux', variant: 'ubuntu', version: '24.04' },
      session: { capability: 'supported', state: 'unlocked' },
    },
    keyCount: KEY_COUNT,
    subscribeKeyEvents: () => () => {},
    theme: makeMinimalTheme(),
  })
}

function makeCtx(
  runtime: ReturnType<typeof makeRuntime>,
  overrides: Partial<{
    activeOwnerName: string | null
    overlayDeckId: string | null
    mainDeckId: string
    pendingOverlayDeckId: string | null
    runtimeDecks: Record<string, DeckConfig>
  }> = {},
) {
  const main = makeDeck()
  return {
    activeOwnerName: overrides.activeOwnerName ?? null,
    config: {
      addons: [],
      decks: { main },
      logging: {},
      main_deck: overrides.mainDeckId ?? 'main',
      theme: 'dark',
    },
    hostContext: {
      os: { type: 'linux' as const, variant: 'ubuntu', version: '24.04' },
      session: { capability: 'supported' as const, state: 'unlocked' as const },
    },
    internalLockedDeckId: '__sireno_locked_session__',
    mainDeckId: overrides.mainDeckId ?? 'main',
    overlayDeckId: overrides.overlayDeckId ?? null,
    pendingOverlayDeckId: overrides.pendingOverlayDeckId ?? null,
    runtimeDecks:
      overrides.runtimeDecks ??
      ({
        main,
        settings: makeDeck({ id: 'settings' }),
        __sireno_locked_session__: makeDeck({ id: '__sireno_locked_session__' }),
      } as Record<string, DeckConfig>),
  }
}

describe('getLastPositionSystemButton dispatcher (55-02)', () => {
  it('injects system-settings on the main-deck reserved slot', () => {
    const runtime = makeRuntime()
    const button = getLastPositionSystemButton(KEY_COUNT - 1, makeDeck(), makeCtx(runtime))
    expect(button).not.toBeNull()
    expect(button?.type).toBe(SYSTEM_SETTINGS_TYPE)
  })

  it('injects system-back on a non-main deck when session is unlocked', () => {
    const runtime = makeRuntime()
    const button = getLastPositionSystemButton(
      KEY_COUNT - 1,
      makeDeck({ id: 'sub' }),
      makeCtx(runtime),
    )
    expect(button?.type).toBe(SYSTEM_BACK_TYPE)
  })

  it('injects overlay-toggle when the active deck is the overlay', () => {
    const runtime = makeRuntime()
    const button = getLastPositionSystemButton(
      KEY_COUNT - 1,
      makeDeck({ id: 'overlay-target' }),
      makeCtx(runtime, { overlayDeckId: 'overlay-target' }),
    )
    expect(button?.type).toBe(OVERLAY_TOGGLE_TYPE)
  })

  it('injects system-back on the main deck when settings deck is missing', () => {
    const runtime = makeRuntime()
    const ctx = makeCtx(runtime)
    const button = getLastPositionSystemButton(
      KEY_COUNT - 1,
      makeDeck(),
      { ...ctx, runtimeDecks: { main: makeDeck() } },
    )
    expect(button?.type).toBe(SYSTEM_BACK_TYPE)
  })

  it('injects overlay-toggle on paginated overlay page decks', () => {
    const runtime = makeRuntime()
    const ctx = makeCtx(runtime, { overlayDeckId: 'overlay-target' })
    const page1Button = getLastPositionSystemButton(
      KEY_COUNT - 1,
      makeDeck({ id: 'overlay-target-p1' }),
      ctx,
    )
    const page2Button = getLastPositionSystemButton(
      KEY_COUNT - 1,
      makeDeck({ id: 'overlay-target-p2' }),
      ctx,
    )
    expect(page1Button?.type).toBe(OVERLAY_TOGGLE_TYPE)
    expect(page2Button?.type).toBe(OVERLAY_TOGGLE_TYPE)
  })

  it('does not inject overlay-toggle on non-overlay decks', () => {
    const runtime = makeRuntime()
    const ctx = makeCtx(runtime, { overlayDeckId: 'overlay-target' })
    const button = getLastPositionSystemButton(
      KEY_COUNT - 1,
      makeDeck({ id: 'other-deck' }),
      ctx,
    )
    expect(button?.type).not.toBe(OVERLAY_TOGGLE_TYPE)
  })

  it('injects system-back-with-pending-overlay when a summonable deck matches', () => {
    const runtime = makeRuntime()
    const ctx = makeCtx(runtime, {
      pendingOverlayDeckId: 'overlay-target',
      runtimeDecks: {
        main: makeDeck(),
        settings: makeDeck({ id: 'settings' }),
        'overlay-target': makeDeck({ id: 'overlay-target' }),
        __sireno_locked_session__: makeDeck({ id: '__sireno_locked_session__' }),
      },
    })
    const button = getLastPositionSystemButton(
      KEY_COUNT - 1,
      makeDeck({ id: 'sub' }),
      ctx,
    )
    expect(button?.type).toBe(SYSTEM_BACK_WITH_PENDING_OVERLAY_TYPE)
    expect(
      (button?.config as { pendingOverlayDeck: DeckConfig }).pendingOverlayDeck
        .id,
    ).toBe('overlay-target')
  })
})
