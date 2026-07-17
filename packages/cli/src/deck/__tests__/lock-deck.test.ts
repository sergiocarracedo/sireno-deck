import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPubSub } from '@/core/pub-sub'
import { createStore } from '@/core/store'
import { createLogger } from '@/util/logger'

import { createActionExecutor } from '@/action/executor'
import { getHostContext } from '../host-context'
import { createMethods } from '../methods'
import { createRuntime, type RuntimeDeck } from '../runtime'

const silentLogger = () => createLogger({ level: 'silent' })

const makeDeck = (overrides: Partial<RuntimeDeck> = {}): RuntimeDeck => ({
  id: 'd1',
  name: 'Deck 1',
  buttons: [],
  ...overrides,
})

const coreLockDeckWith = (
  buttons: ReadonlyArray<{
    type: string
    position?: number
    config?: unknown
    actions?: { tap?: string; dbltap?: string; hold?: string }
  }>,
): RuntimeDeck => ({
  id: 'core:lock',
  name: 'Lock',
  buttons: buttons.map((b, i) => ({
    id: b.position !== undefined ? String(b.position) : `b${i}`,
    ...(b.position !== undefined ? { position: b.position } : {}),
    type: b.type,
    ...(b.config !== undefined ? { config: b.config } : {}),
    ...(b.actions !== undefined ? { actions: b.actions } : {}),
  })),
})

const defaultCoreLockDeck = (): RuntimeDeck =>
  coreLockDeckWith([
    { type: 'date-time:locked-time-tile', position: 0, config: { slot: 'hour' } },
    { type: 'date-time:locked-time-tile', position: 1, config: { slot: 'separator' } },
    { type: 'date-time:locked-time-tile', position: 2, config: { slot: 'minute' } },
  ])

const setup = (decks: ReadonlyArray<RuntimeDeck>) => {
  const pubSub = createPubSub()
  const store = createStore()
  const executor = createActionExecutor({ host: getHostContext() })
  const methodsRef: { current: ReturnType<typeof createMethods> | undefined } =
    { current: undefined }
  const runtime = createRuntime({
    decks,
    pubSub,
    store,
    logger: silentLogger(),
    getMethods: () => methodsRef.current!,
  })
  const methods = createMethods({
    runtime,
    pubSub,
    store,
    executor,
    logger: silentLogger(),
  })
  methodsRef.current = methods
  return { runtime, pubSub, store, methods }
}

const fakeSessionProvider = () => {
  let handler: ((state: 'locked' | 'unlocked' | 'unknown') => void) | null =
    null
  return {
    getState: () => 'unknown' as const,
    subscribe: (
      cb: (state: 'locked' | 'unlocked' | 'unknown') => void,
    ): (() => void) => {
      handler = cb
      return () => {
        handler = null
      }
    },
    stop: async () => undefined,
    emit: (state: 'locked' | 'unlocked' | 'unknown') => {
      handler?.(state)
    },
  }
}

describe('lock deck — addon factory output (Phase 6)', () => {
  describe('getActiveDeck returns the registered core:lock deck', () => {
    it('uses the default 3-button deck when no user config', () => {
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        defaultCoreLockDeck(),
      ])
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      const deck = runtime.getActiveDeck()
      expect(deck.id).toBe('core:lock')
      expect(deck.buttons).toHaveLength(3)
      expect(deck.buttons.every((b) => b.type === 'date-time:locked-time-tile')).toBe(
        true,
      )
    })

    it('uses user-defined buttons when core:lock was registered with them', () => {
      const userLockDeck = coreLockDeckWith([
        { type: 'core:change-deck', position: 0, config: { deck: 'main' } },
        { type: 'core:action', position: 1, config: { command: 'xdotool key ctrl+l' } },
      ])
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        userLockDeck,
      ])
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      const deck = runtime.getActiveDeck()
      expect(deck.buttons).toHaveLength(2)
      expect(deck.buttons[0]?.type).toBe('core:change-deck')
      expect(deck.buttons[1]?.type).toBe('core:action')
    })
  })

  describe('lock-mode gesture suppression in invokeAction', () => {
    it('suppresses non-folder actions on lock deck', async () => {
      const dispatch = vi.fn(async () => undefined)
      const { runtime, methods } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        coreLockDeckWith([
          { type: 'core:action', position: 0, actions: { tap: 'paste://test' } },
        ]),
      ])
      methods.dispatch = dispatch
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      await runtime.dispatchGesture('core:lock:0', 'tap')
      expect(dispatch).not.toHaveBeenCalled()
      expect(runtime.isLockActive()).toBe(true)
    })

    it('folder-nav button (core:change-deck) escapes lock and dispatches', async () => {
      const dispatch = vi.fn(async () => undefined)
      const { runtime, methods } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        makeDeck({ id: 'system', buttons: [] }),
        coreLockDeckWith([
          { type: 'core:change-deck', position: 0, config: { deck: 'system' } },
        ]),
      ])
      methods.dispatch = dispatch
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      expect(runtime.isLockActive()).toBe(true)
      const onTap = vi.fn(async () => {
        runtime.navigateToDeck('system', { addToHistory: false })
      })
      runtime.registerButtonHandler('core:lock:0', { onTap })
      await runtime.dispatchGesture('core:lock:0', 'tap')
      expect(onTap).toHaveBeenCalled()
      expect(runtime.isLockActive()).toBe(false)
    })

    it('non-folder-nav button (core:toggle) does NOT escape lock', async () => {
      const dispatch = vi.fn(async () => undefined)
      const { runtime, methods } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        coreLockDeckWith([{ type: 'core:toggle', position: 0 }]),
      ])
      methods.dispatch = dispatch
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      await runtime.dispatchGesture('core:lock:0', 'tap')
      expect(dispatch).not.toHaveBeenCalled()
      expect(runtime.isLockActive()).toBe(true)
    })
  })

  describe('idempotent unlock handler', () => {
    it('OS unlock after folder-escape is a no-op', async () => {
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        makeDeck({ id: 'system', buttons: [] }),
        coreLockDeckWith([
          { type: 'core:change-deck', position: 0, config: { deck: 'system' } },
        ]),
      ])
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      runtime.registerButtonHandler('core:lock:0', {
        onTap: async () => {
          runtime.navigateToDeck('system', { addToHistory: false })
        },
      })
      await runtime.dispatchGesture('core:lock:0', 'tap')
      expect(runtime.isLockActive()).toBe(false)
      session.emit('unlocked')
      expect(runtime.getActiveDeckId()).toBe('system')
      expect(runtime.isLockActive()).toBe(false)
    })
  })

  describe('runtime:lock-mode pubsub event', () => {
    it('publishes on lock-entry with reason=session-locked', () => {
      const { runtime, pubSub } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        defaultCoreLockDeck(),
      ])
      const events: unknown[] = []
      pubSub.subscribe<{ active: boolean; reason: string }>(
        'runtime:lock-mode',
        (p) => events.push(p),
      )
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      expect(events).toContainEqual({
        active: true,
        reason: 'session-locked',
      })
    })

    it('publishes on unlock with reason=session-unlocked', () => {
      const { runtime, pubSub } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        defaultCoreLockDeck(),
      ])
      const events: unknown[] = []
      pubSub.subscribe<{ active: boolean; reason: string }>(
        'runtime:lock-mode',
        (p) => events.push(p),
      )
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      session.emit('unlocked')
      expect(events).toContainEqual({
        active: false,
        reason: 'session-unlocked',
      })
    })

    it('publishes on folder-escape with reason=escape', async () => {
      const { runtime, pubSub } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        makeDeck({ id: 'system', buttons: [] }),
        coreLockDeckWith([
          { type: 'core:change-deck', position: 0, config: { deck: 'system' } },
        ]),
      ])
      const events: unknown[] = []
      pubSub.subscribe<{ active: boolean; reason: string }>(
        'runtime:lock-mode',
        (p) => events.push(p),
      )
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      runtime.registerButtonHandler('core:lock:0', {
        onTap: async () => {
          runtime.navigateToDeck('system', { addToHistory: false })
        },
      })
      await runtime.dispatchGesture('core:lock:0', 'tap')
      expect(events).toContainEqual({ active: false, reason: 'escape' })
    })
  })

  describe('navigateToDeck("core:lock") behaves as a regular deck', () => {
    it('navigates to core:lock like any other deck (does not enter lock mode)', () => {
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        defaultCoreLockDeck(),
      ])
      expect(runtime.isLockActive()).toBe(false)
      runtime.navigateToDeck('core:lock')
      expect(runtime.isLockActive()).toBe(false)
      expect(runtime.getActiveDeckId()).toBe('core:lock')
    })

    it('lock mode activates via session provider only — not via navigation', () => {
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        defaultCoreLockDeck(),
      ])
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      expect(runtime.isLockActive()).toBe(false)
      runtime.navigateToDeck('core:lock')
      expect(runtime.isLockActive()).toBe(false)
      session.emit('locked')
      expect(runtime.isLockActive()).toBe(true)
      expect(runtime.getActiveDeckId()).toBe('core:lock')
    })

    it('navigating to core:lock without user config yields the 3 default time buttons', () => {
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        defaultCoreLockDeck(),
      ])
      runtime.navigateToDeck('core:lock')
      expect(runtime.isLockActive()).toBe(false)
      const deck = runtime.getActiveDeck()
      expect(deck.id).toBe('core:lock')
      expect(deck.buttons).toHaveLength(3)
      expect(deck.buttons.every((b) => b.type === 'date-time:locked-time-tile')).toBe(
        true,
      )
      expect(deck.buttons[0]?.config).toEqual({ slot: 'hour' })
      expect(deck.buttons[1]?.config).toEqual({ slot: 'separator' })
      expect(deck.buttons[2]?.config).toEqual({ slot: 'minute' })
    })

    it('navigating to core:lock with user config yields the user buttons', () => {
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        coreLockDeckWith([
          { type: 'core:change-deck', position: 0, config: { deck: 'system' } },
        ]),
      ])
      runtime.navigateToDeck('core:lock')
      const deck = runtime.getActiveDeck()
      expect(deck.buttons).toHaveLength(1)
      expect(deck.buttons[0]?.type).toBe('core:change-deck')
    })
  })
})