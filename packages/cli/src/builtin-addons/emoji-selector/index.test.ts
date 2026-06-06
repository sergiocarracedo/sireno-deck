import { afterEach, describe, expect, it, vi } from 'vitest'

import { setDomAssetPathResolver } from '../../addon/api.js'
import { createBundledAddonRegistry } from '../../config/loader.js'
import { renderReactNodeToHtml } from '../../render/dom-host.js'
import { UNKNOWN_HOST_CONTEXT } from '../../system/host-context.js'
import emojiSelectorAddon from './index.js'

const mountedButtonMethods = {
  getActiveDeckId: () => 'main',
  goBack() {},
  invalidate() {},
  navigateToDeck() {},
  runCommand: async () => ({}) as never,
}

function createStoreScope(initialSnapshot?: unknown) {
  let snapshot = initialSnapshot

  return {
    clear() {
      snapshot = undefined
    },
    get snapshot() {
      return snapshot
    },
    set(value: unknown) {
      snapshot = value
    },
    update(updater: (current: unknown) => unknown) {
      snapshot = updater(snapshot)
    },
  }
}

function createMountedHarness(
  definition: NonNullable<(typeof emojiSelectorAddon.buttons)[number]>,
  config: unknown,
  position: number,
  methodOverrides: Partial<typeof mountedButtonMethods> = {},
) {
  const props = {
    button: { position, type: definition.type },
    config,
    frameState: 'idle',
    hostContext: UNKNOWN_HOST_CONTEXT,
    methods: { ...mountedButtonMethods, ...methodOverrides },
    pressed: false,
    store: {
      addon: createStoreScope(),
      button: createStoreScope(),
    },
    theme: {} as never,
  } as Parameters<typeof definition.render>[0]

  return {
    props,
    render: () => definition.render(props),
    tap: async () => definition.onTap?.(props),
  }
}

describe('emoji-selector addon', () => {
  afterEach(() => {
    setDomAssetPathResolver()
  })

  it('exports emoji decks with favorites-first category navigation', () => {
    expect(emojiSelectorAddon.name).toBe('emoji-selector')
    expect(emojiSelectorAddon.assets).toHaveProperty('favorites.svg')
    expect(emojiSelectorAddon.assets?.['favorites.svg']).toContain('favorites.svg')

    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: ['🔥', '🍕'],
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })

    expect(decks?.emoji?.buttons[0]).toMatchObject({
      label: 'Favorites',
      target_deck: 'emoji-favorites',
      type: 'emoji-category-button',
    })
    expect(decks?.['emoji-favorites']?.buttons[0]).toMatchObject({
      emoji: '🔥',
      label: 'Favorites',
      type: 'emoji-entry-button',
    })
  })

  it('targets the actual first-page deck ID for multi-page categories on the main deck', () => {
    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: [],
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })

    const mainDeckButtons = decks?.emoji?.buttons ?? []
    const smileysButton = mainDeckButtons.find(
      (b) => b.type === 'emoji-category-button' && b.label === 'Smileys',
    )
    expect(smileysButton).toMatchObject({
      label: 'Smileys',
      target_deck: 'emoji-smileys-p1',
      type: 'emoji-category-button',
    })
  })

  it('runs the select command with the chosen emoji', async () => {
    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-entry-button',
    )
    const runCommand = vi.fn()
    const harness = createMountedHarness(
      entryDefinition!,
      {
        emoji: '😀',
        label: 'Smileys',
        select_command: "printf '%s' '{{emoji}}'",
      },
      2,
      { runCommand },
    )

    await harness.tap()

    expect(runCommand).toHaveBeenCalledWith("printf '%s' '😀'")
  })

  it('renders bundled icon-backed emoji entry buttons for shipped emoji values', () => {
    const registry = createBundledAddonRegistry()
    setDomAssetPathResolver((assetReference) =>
      registry.resolveAssetPath(assetReference),
    )

    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-entry-button',
    )
    const harness = createMountedHarness(entryDefinition!, {
        emoji: '😀',
        label: 'Smileys',
        select_command: "printf '%s' '{{emoji}}'",
      },
      2,
      { runCommand: vi.fn() },
    )

    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('<img')
    expect(html).toContain('emoji-grin.svg')
    expect(html).toContain('GRIN')
  })

  it('keeps shipped deck icons on addon asset references that the shared resolver expands later', () => {
    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: ['😀'],
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })

    expect(decks?.emoji?.buttons[0]).toMatchObject({
      icon: 'addon://emoji-selector/favorites.svg',
      label: 'Favorites',
    })
    expect(decks?.['emoji-favorites']?.buttons[0]).toMatchObject({
      emoji: '😀',
      type: 'emoji-entry-button',
    })
  })

  it('renders the real unicode glyph for non-branded emojis via the native font stack', () => {
    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-entry-button',
    )
    const harness = createMountedHarness(entryDefinition!, {
        emoji: '🛰️',
        label: 'Custom',
        select_command: "printf '%s' '{{emoji}}'",
      },
      4,
      { runCommand: vi.fn() },
    )

    const html = renderReactNodeToHtml(harness.render() as never)

    expect(html).toContain('🛰️')
    expect(html).not.toContain('U+1F6F0')
    expect(html).toContain('Apple Color Emoji')
    expect(html).toContain('Noto Color Emoji')
    expect(html).toContain('data-sireno-ui-text="true"')
    expect(html).toContain('text-5xl')
  })

  it('paginates categories with more emojis than fit on one page', () => {
    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: [],
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })

    expect(decks?.['emoji-drink-p1']).toBeDefined()
    expect(decks?.['emoji-drink-p2']).toBeDefined()

    const page1 = decks?.['emoji-drink-p1']
    const page2 = decks?.['emoji-drink-p2']

    expect(
      page1?.buttons.filter((b) => b.type === 'emoji-entry-button').length,
    ).toBe(14)

    const page2NavButtons = page2?.buttons.filter(
      (b) => b.type === 'change-deck',
    )
    expect(page2NavButtons?.length).toBe(1)

    const page2Prev = page2?.buttons.find(
      (b) => b.type === 'change-deck' && b.position === 12,
    )
    expect(page2Prev).toMatchObject({
      label: '‹ Page 2',
      target_deck: 'emoji-drink-p1',
    })

    expect(page2?.name).toBe('Drink (2/2)')
  })

  it('omits pagination for single-page categories', () => {
    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: ['😀', '😂'],
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })

    expect(decks?.['emoji-favorites']).toBeDefined()
    expect(decks?.['emoji-favorites-p1']).toBeUndefined()

    const favButtons = decks?.['emoji-favorites']?.buttons ?? []
    expect(favButtons.filter((b) => b.type === 'change-deck').length).toBe(0)
  })

  it('treats a category that exactly fits the page as a single page (no nav buttons)', () => {
    const emojiPage = Array.from({ length: 14 }, (_, index) =>
      String.fromCodePoint(0x1f600 + index),
    )

    const pageBoundaries = emojiPage.length
    expect(pageBoundaries).toBe(14)

    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: emojiPage,
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })

    expect(decks?.['emoji-favorites']).toBeDefined()
    expect(decks?.['emoji-favorites-p1']).toBeUndefined()
    expect(decks?.['emoji-favorites-p2']).toBeUndefined()

    const favButtons = decks?.['emoji-favorites']?.buttons ?? []
    expect(favButtons.filter((b) => b.type === 'change-deck').length).toBe(0)
    expect(favButtons.filter((b) => b.type === 'emoji-entry-button').length).toBe(
      14,
    )
  })

  it('treats EMOJI_PAGE_SIZE+1 favorites as 2 pages with prev on page 2 and no next', () => {
    const overflowEmojis = Array.from(
      { length: 15 },
      (_, index) => String.fromCodePoint(0x1f600 + index),
    )

    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: overflowEmojis,
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })

    expect(decks?.['emoji-favorites-p1']).toBeDefined()
    expect(decks?.['emoji-favorites-p2']).toBeDefined()

    const page1 = decks?.['emoji-favorites-p1']
    const page2 = decks?.['emoji-favorites-p2']

    expect(page1?.buttons.filter((b) => b.type === 'emoji-entry-button').length).toBe(14)
    const page1Next = page1?.buttons.find(
      (b) => b.type === 'change-deck' && b.position === 13,
    )
    expect(page1Next).toMatchObject({
      label: 'Page 2 ›',
      target_deck: 'emoji-favorites-p2',
    })

    expect(page2?.buttons.filter((b) => b.type === 'emoji-entry-button').length).toBe(1)
    const page2NavButtons = page2?.buttons.filter(
      (b) => b.type === 'change-deck',
    )
    expect(page2NavButtons?.length).toBe(1)

    const page2Prev = page2?.buttons.find((b) => b.position === 12)
    expect(page2Prev).toMatchObject({
      label: '‹ Page 2',
      target_deck: 'emoji-favorites-p1',
      type: 'change-deck',
    })

    const lastSlot = page2?.buttons.find((b) => b.position === 13)
    expect(lastSlot).toBeUndefined()
  })

  it('handles empty favorites array as if there are no favorites', () => {
    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: [],
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })

    expect(decks?.['emoji-favorites']).toBeUndefined()
    expect(decks?.['emoji-favorites-p1']).toBeUndefined()
    expect(decks?.emoji).toBeDefined()
  })

  it('covers the pre-split piliapp-style subcategories', () => {
    const expectedIds = [
      'smileys',
      'people',
      'animals',
      'nature',
      'food',
      'drink',
      'activities',
      'travel',
      'objects',
      'symbols',
      'flags',
    ]
    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: {
        favorites: [],
        select_command: "printf '%s' '{{emoji}}'",
      },
      deck: { id: 'emoji', type: 'emoji-selector' },
    })
    for (const id of expectedIds) {
      const firstPageId = `emoji-${id}-p1`
      const singleId = `emoji-${id}`
      expect(decks?.[firstPageId] ?? decks?.[singleId]).toBeDefined()
    }
  })

  it('exposes the conventional shortcode for emojis in the catalog', async () => {
    const { getEmojiShortcode } = await import('./support.js')
    expect(getEmojiShortcode('🔥')).toBe('fire')
    expect(getEmojiShortcode('😀')).toBe('grinning')
    expect(getEmojiShortcode('not-in-catalog')).toBeUndefined()
  })
})
