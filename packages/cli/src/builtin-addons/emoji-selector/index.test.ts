import { afterEach, describe, expect, it, vi } from 'vitest'

import { setDomAssetPathResolver } from '../../addon/api.js'
import { createBundledAddonRegistry } from '../../config/loader.js'
import { renderReactNodeToHtml } from '../../render/dom-host.js'
import emojiSelectorAddon from './index.js'

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

  it('runs the select command with the chosen emoji', async () => {
    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-entry-button',
    )
    const runCommand = vi.fn()
    const instance = entryDefinition?.createInstance({
      button: { position: 2 },
      config: {
        emoji: '😀',
        label: 'Smileys',
        select_command: "printf '%s' '{{emoji}}'",
      },
      methods: { runCommand },
    } as never)

    await instance?.onTap?.()

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
    const instance = entryDefinition?.createInstance({
      button: { position: 2 },
      config: {
        emoji: '😀',
        label: 'Smileys',
        select_command: "printf '%s' '{{emoji}}'",
      },
      methods: { runCommand: vi.fn() },
    } as never)

    const html = renderReactNodeToHtml(instance?.render() as never)

    expect(html).toContain('file://')
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
    expect(decks?.['emoji-favorites']?.buttons[1]).toMatchObject({
      icon: 'addon://emoji-selector/back.svg',
      label: 'Back',
    })
  })

  it('keeps an explicit text fallback for unsupported emoji values', () => {
    const entryDefinition = emojiSelectorAddon.buttons.find(
      (button) => button.type === 'emoji-entry-button',
    )
    const instance = entryDefinition?.createInstance({
      button: { position: 4 },
      config: {
        emoji: '🛰️',
        label: 'Custom',
        select_command: "printf '%s' '{{emoji}}'",
      },
      methods: { runCommand: vi.fn() },
    } as never)

    const html = renderReactNodeToHtml(instance?.render() as never)

    expect(html).toContain('U+1F6F0')
    expect(html).toContain('font-main text-foreground')
  })
})
