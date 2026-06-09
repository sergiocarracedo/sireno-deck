import { describe, expect, it } from 'vitest'

import { DeckNavigationError, createDeckController } from '../controller'

describe('createDeckController', () => {
  const decks = {
    apps: { id: 'apps', buttons: [] },
    main: { id: 'main', buttons: [] },
    tools: { id: 'tools', buttons: [] },
  }

  it('starts on the configured main deck', () => {
    const controller = createDeckController({ decks, mainDeckId: 'main' })

    expect(controller.getActiveDeckId()).toBe('main')
    expect(controller.getActiveDeck()).toEqual(decks.main)
  })

  it('throws when the main deck is missing', () => {
    expect(() =>
      createDeckController({ decks, mainDeckId: 'missing' }),
    ).toThrow(DeckNavigationError)
  })

  it('navigates forward to a target deck', () => {
    const controller = createDeckController({ decks, mainDeckId: 'main' })

    controller.navigateTo('apps')

    expect(controller.getActiveDeckId()).toBe('apps')
    expect(controller.canGoBack()).toBe(true)
  })

  it('returns to the previous deck', () => {
    const controller = createDeckController({ decks, mainDeckId: 'main' })

    controller.navigateTo('apps')
    controller.navigateTo('tools')
    controller.goBack()

    expect(controller.getActiveDeckId()).toBe('apps')
    expect(controller.goBack()).toEqual(decks.main)
  })

  it('throws on unknown navigation targets', () => {
    const controller = createDeckController({ decks, mainDeckId: 'main' })

    expect(() => controller.navigateTo('missing')).toThrow(
      "Deck 'missing' is not defined",
    )
  })

  it('replaces the active deck when push is false and keeps the stack length unchanged', () => {
    const controller = createDeckController({ decks, mainDeckId: 'main' })

    controller.navigateTo('apps', { push: false })

    expect(controller.getActiveDeckId()).toBe('apps')
    expect(controller.getStackSnapshot()).toEqual(['apps'])
    expect(controller.getStackSnapshot().length).toBe(1)
    expect(controller.canGoBack()).toBe(false)
  })

  it('still pushes to the stack when push is true (explicit)', () => {
    const controller = createDeckController({ decks, mainDeckId: 'main' })

    controller.navigateTo('apps', { push: true })

    expect(controller.getActiveDeckId()).toBe('apps')
    expect(controller.getStackSnapshot()).toEqual(['main', 'apps'])
    expect(controller.canGoBack()).toBe(true)
  })

  it('treats push:false as a top-replacement — goBack returns to the deck before the entry push', () => {
    const controller = createDeckController({ decks, mainDeckId: 'main' })

    controller.navigateTo('apps', { push: true })
    controller.navigateTo('tools', { push: false })
    controller.goBack()

    expect(controller.getActiveDeckId()).toBe('main')
  })
})
