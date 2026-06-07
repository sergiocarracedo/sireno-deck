import { afterEach, describe, expect, it, vi } from 'vitest'

import { setDomAssetPathResolver } from '@/addon/api'
import { createBundledAddonRegistry } from '@/config/loader'
import { renderReactNodeToHtml } from '@/render/dom-host'
import { UNKNOWN_HOST_CONTEXT } from '@/system/host-context'
import emojiSelectorAddon from './index'

const mountedButtonMethods = {
  getActiveDeckId: () => 'main',
  goBack() {},
  invalidate() {},
  navigateToDeck() {},
  pasteText: async () => {},
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
  options:
    | Partial<typeof mountedButtonMethods>
    | {
        hostContext?: Parameters<typeof definition.render>[0]['hostContext']
        methodOverrides?: Partial<typeof mountedButtonMethods>
      } = {},
) {
  const isOptionsObject = 'hostContext' in options || 'methodOverrides' in options
  const methodOverrides = isOptionsObject
    ? (options as { methodOverrides?: Partial<typeof mountedButtonMethods> }).methodOverrides ?? {}
    : (options as Partial<typeof mountedButtonMethods>)
  const hostContext =
    isOptionsObject && (options as { hostContext?: typeof UNKNOWN_HOST_CONTEXT }).hostContext !== undefined
      ? (options as { hostContext: typeof UNKNOWN_HOST_CONTEXT }).hostContext
      : UNKNOWN_HOST_CONTEXT
  const props = {
    button: { position, type: definition.type },
    config,
    frameState: 'idle',
    hostContext,
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
      type: 'emoji-emoji-button',
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
      (button) => button.type === 'emoji-emoji-button',
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

  it('pastes the shortcode on double-tap when the catalog knows one', async () => {
    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-emoji-button',
    )
    const pasteText = vi.fn()
    const harness = createMountedHarness(
      entryDefinition!,
      {
        emoji: '😀',
        label: 'Smileys',
        select_command: "printf '%s' '{{emoji}}'",
      },
      2,
      { pasteText },
    )

    await entryDefinition!.onDblTap?.(harness.props)

    expect(pasteText).toHaveBeenCalledWith(':grinning:')
  })

  it('is a no-op on double-tap when the catalog has no shortcode for the emoji', async () => {
    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-emoji-button',
    )
    const pasteText = vi.fn()
    const harness = createMountedHarness(
      entryDefinition!,
      {
        emoji: '\u{1F4A9}', // pile of poo, intentionally not in shipped shortcode catalog
        label: 'Pile of Poo',
        select_command: "printf '%s' '{{emoji}}'",
      },
      2,
      { pasteText },
    )

    await entryDefinition!.onDblTap?.(harness.props)

    expect(pasteText).not.toHaveBeenCalled()
  })

  it('renders bundled icon-backed emoji entry buttons for shipped emoji values', () => {
    const registry = createBundledAddonRegistry()
    setDomAssetPathResolver((assetReference) =>
      registry.resolveAssetPath(assetReference),
    )

    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-emoji-button',
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
      type: 'emoji-emoji-button',
    })
  })

  it('renders the real unicode glyph for non-branded emojis via the native font stack', () => {
    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-emoji-button',
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
      page1?.buttons.filter((b) => b.type === 'emoji-emoji-button').length,
    ).toBe(12)

    const page1NavButton = page1?.buttons.find(
      (b) => b.type === 'change-deck' && b.position === 13,
    )
    expect(page1NavButton).toMatchObject({
      meta: 'page-nav',
      target_deck: 'emoji-drink-p2',
    })

    const page2NavButton = page2?.buttons.find(
      (b) => b.type === 'change-deck' && b.position === 13,
    )
    expect(page2NavButton).toMatchObject({
      meta: 'page-nav',
      target_deck: 'emoji-drink-p2',
      target_deck_double_tap: 'emoji-drink-p1',
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
    const emojiPage = Array.from({ length: 12 }, (_, index) =>
      String.fromCodePoint(0x1f600 + index),
    )

    const pageBoundaries = emojiPage.length
    expect(pageBoundaries).toBe(12)

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
    expect(favButtons.filter((b) => b.type === 'emoji-emoji-button').length).toBe(
      12,
    )
  })

  it('treats EMOJI_PAGE_SIZE+1 favorites as 2 pages with prev on page 2 and no next', () => {
    const overflowEmojis = Array.from(
      { length: 13 },
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

    expect(page1?.buttons.filter((b) => b.type === 'emoji-emoji-button').length).toBe(12)
    const page1Next = page1?.buttons.find(
      (b) => b.type === 'change-deck' && b.position === 13,
    )
    expect(page1Next).toMatchObject({
      meta: 'page-nav',
      target_deck: 'emoji-favorites-p2',
    })

    expect(page2?.buttons.filter((b) => b.type === 'emoji-emoji-button').length).toBe(1)
    const page2NavButtons = page2?.buttons.filter(
      (b) => b.type === 'change-deck',
    )
    expect(page2NavButtons?.length).toBe(1)

    const page2Nav = page2?.buttons.find((b) => b.position === 13)
    expect(page2Nav).toMatchObject({
      meta: 'page-nav',
      target_deck: 'emoji-favorites-p2',
      target_deck_double_tap: 'emoji-favorites-p1',
      type: 'change-deck',
    })
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

  it('renders the launcher button as a 2x3 grid of the six representative emojis', () => {
    const launcherDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-selector',
    )
    expect(launcherDefinition).toBeDefined()
    const harness = createMountedHarness(launcherDefinition!, { label: 'Emojis' }, 0, {
      hostContext: {
        os: { type: 'darwin', variant: 'macos', version: '14.0' },
        session: { capability: 'supported', state: 'unlocked' },
      },
      methodOverrides: { runCommand: vi.fn() },
    })
    const html = renderReactNodeToHtml(harness.render() as never)
    expect(html).toContain('data-sireno-launcher-grid="true"')
    for (const cell of ['😂', '🔥', '❤️', '⭐', '🍕', '🎵']) {
      expect(html).toContain(cell)
    }
  })
})
