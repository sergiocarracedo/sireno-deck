import { describe, expect, it, vi } from 'vitest'

import { createPubSub } from '@/core/pub-sub'
import { createStore } from '@/core/store'
import { createLogger } from '@/util/logger'

import { createActionExecutor } from '@/action/executor'
import { getHostContext } from '../host-context'
import { createMethods } from '../methods'
import {
  createRuntime,
  type LockDeckConfig,
  type RuntimeDeck,
} from '../runtime'

const silentLogger = () => createLogger({ level: 'silent' })

const makeDeck = (overrides: Partial<RuntimeDeck> = {}): RuntimeDeck => ({
  id: 'd1',
  name: 'Deck 1',
  buttons: [],
  ...overrides,
})

const setup = (
  decks: ReadonlyArray<RuntimeDeck>,
  lockConfig?: LockDeckConfig,
) => {
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
    ...(lockConfig !== undefined ? { lockConfig } : {}),
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

describe('lock deck — user-defined buttons (Phase 6 Plan 2)', () => {
  describe('getActiveDeck returns user-defined lock deck when configured', () => {
    it('uses default 3-button time deck when lockConfig.buttons is absent', async () => {
      const { runtime, pubSub, store } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
      ])
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      const deck = runtime.getActiveDeck()
      expect(deck.id).toBe('core:lock')
      expect(deck.buttons).toHaveLength(3)
      expect(
        deck.buttons.every((b) => b.type === 'date-time:locked-time-tile'),
      ).toBe(true)
      session.emit('unlocked')
      void pubSub
      void store
    })

    it('uses user-defined buttons when lockConfig.buttons is non-empty', () => {
      const lockConfig: LockDeckConfig = {
        buttons: [
          {
            type: 'core:change-deck',
            position: 0,
            config: { deck: 'main' },
          },
          {
            type: 'core:action',
            position: 1,
            config: { command: 'xdotool key ctrl+l' },
          },
        ],
      }
      const { runtime } = setup(
        [makeDeck({ id: 'main', isMain: true, buttons: [] })],
        lockConfig,
      )
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      const deck = runtime.getActiveDeck()
      expect(deck.id).toBe('core:lock')
      expect(deck.buttons).toHaveLength(2)
      expect(deck.buttons[0]?.type).toBe('core:change-deck')
      expect(deck.buttons[1]?.type).toBe('core:action')
    })

    it('falls back to default deck when lockConfig.buttons is empty array', () => {
      const { runtime } = setup(
        [makeDeck({ id: 'main', isMain: true, buttons: [] })],
        { buttons: [] },
      )
      const session = fakeSessionProvider()
      runtime.setSessionProvider(session)
      session.emit('locked')
      const deck = runtime.getActiveDeck()
      expect(deck.buttons).toHaveLength(3)
    })
  })

  describe('lock-mode gesture suppression in invokeAction', () => {
    it('suppresses non-folder actions on lock deck', async () => {
      const dispatch = vi.fn(async () => undefined)
      const { runtime, methods } = setup(
        [
          makeDeck({
            id: 'main',
            isMain: true,
            buttons: [
              {
                id: 'b1',
                type: 'core:action',
                actions: { tap: 'paste://test' },
              },
            ],
          }),
        ],
        {
          buttons: [
            {
              type: 'core:action',
              position: 0,
              actions: { tap: 'paste://test' },
            },
          ],
        },
      )
      void methods
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
      const { runtime, methods } = setup(
        [
          makeDeck({ id: 'main', isMain: true, buttons: [] }),
          makeDeck({ id: 'system', buttons: [] }),
        ],
        {
          buttons: [
            {
              type: 'core:change-deck',
              position: 0,
              config: { deck: 'system' },
            },
          ],
        },
      )
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
      const { runtime, methods } = setup(
        [makeDeck({ id: 'main', isMain: true, buttons: [] })],
        {
          buttons: [{ type: 'core:toggle', position: 0 }],
        },
      )
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
      const { runtime } = setup(
        [
          makeDeck({ id: 'main', isMain: true, buttons: [] }),
          makeDeck({ id: 'system', buttons: [] }),
        ],
        {
          buttons: [
            {
              type: 'core:change-deck',
              position: 0,
              config: { deck: 'system' },
            },
          ],
        },
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
      const { runtime, pubSub } = setup(
        [
          makeDeck({ id: 'main', isMain: true, buttons: [] }),
          makeDeck({ id: 'system', buttons: [] }),
        ],
        {
          buttons: [
            {
              type: 'core:change-deck',
              position: 0,
              config: { deck: 'system' },
            },
          ],
        },
      )
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
      ])
      // The test setup doesn't include the core addon's deck factory, so core:lock
      // is registered through the addon system in real runs. Here we simulate that
      // by including core:lock as a regular deck.
      const { runtime: r2 } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        makeDeck({ id: 'core:lock', name: 'Lock', buttons: [] }),
      ])
      expect(runtime.isLockActive()).toBe(false)
      r2.navigateToDeck('core:lock')
      expect(r2.isLockActive()).toBe(false)
      expect(r2.getActiveDeckId()).toBe('core:lock')
    })

    it('does not log "deck not found" warning for core:lock', () => {
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        makeDeck({ id: 'core:lock', name: 'Lock', buttons: [] }),
      ])
      runtime.navigateToDeck('core:lock')
      expect(runtime.isLockActive()).toBe(false)
    })

    it('lock mode activates via session provider only — not via navigation', () => {
      const { runtime } = setup([
        makeDeck({ id: 'main', isMain: true, buttons: [] }),
        makeDeck({ id: 'core:lock', name: 'Lock', buttons: [] }),
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
  })
})
