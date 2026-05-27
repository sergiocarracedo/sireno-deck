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
    expect(decks?.['emoji-favorites']?.buttons[1]).toMatchObject({
      icon: 'addon://emoji-selector/back.svg',
      label: 'Back',
    })
  })

  it('keeps an explicit text fallback for unsupported emoji values', () => {
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

    expect(html).toContain('U+1F6F0')
    expect(html).toContain('font-main text-foreground')
  })
})
