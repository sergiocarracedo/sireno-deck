import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { z } from 'zod'

import type { SirenoAddon } from '../../addon/api.js'

const CATEGORY_DEFINITIONS = [
  {
    emojis: ['😀', '😂', '🥳', '😎'],
    icon: 'addon://emoji-selector/smileys.svg',
    id: 'smileys',
    label: 'Smileys',
  },
  {
    emojis: ['🌿', '🌊', '🔥', '🌈'],
    icon: 'addon://emoji-selector/nature.svg',
    id: 'nature',
    label: 'Nature',
  },
  {
    emojis: ['🍕', '🍣', '☕', '🍓'],
    icon: 'addon://emoji-selector/food.svg',
    id: 'food',
    label: 'Food',
  },
] as const

const assets = {
  'back.svg': fileURLToPath(new URL('../assets/back.svg', import.meta.url)),
  'emoji-berry.svg': fileURLToPath(
    new URL('../assets/emoji-berry.svg', import.meta.url),
  ),
  'emoji-coffee.svg': fileURLToPath(
    new URL('../assets/emoji-coffee.svg', import.meta.url),
  ),
  'emoji-cool.svg': fileURLToPath(
    new URL('../assets/emoji-cool.svg', import.meta.url),
  ),
  'emoji-fire.svg': fileURLToPath(
    new URL('../assets/emoji-fire.svg', import.meta.url),
  ),
  'emoji-grin.svg': fileURLToPath(
    new URL('../assets/emoji-grin.svg', import.meta.url),
  ),
  'emoji-joy.svg': fileURLToPath(
    new URL('../assets/emoji-joy.svg', import.meta.url),
  ),
  'emoji-leaf.svg': fileURLToPath(
    new URL('../assets/emoji-leaf.svg', import.meta.url),
  ),
  'emoji-party.svg': fileURLToPath(
    new URL('../assets/emoji-party.svg', import.meta.url),
  ),
  'emoji-pizza.svg': fileURLToPath(
    new URL('../assets/emoji-pizza.svg', import.meta.url),
  ),
  'emoji-rainbow.svg': fileURLToPath(
    new URL('../assets/emoji-rainbow.svg', import.meta.url),
  ),
  'emoji-sushi.svg': fileURLToPath(
    new URL('../assets/emoji-sushi.svg', import.meta.url),
  ),
  'emoji-wave.svg': fileURLToPath(
    new URL('../assets/emoji-wave.svg', import.meta.url),
  ),
  'favorites.svg': fileURLToPath(
    new URL('../assets/favorites.svg', import.meta.url),
  ),
  'food.svg': fileURLToPath(new URL('../assets/food.svg', import.meta.url)),
  'nature.svg': fileURLToPath(new URL('../assets/nature.svg', import.meta.url)),
  'smileys.svg': fileURLToPath(
    new URL('../assets/smileys.svg', import.meta.url),
  ),
}

const EmojiCategoryButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    target_deck: z.string().min(1),
  })
  .strict()

const EmojiEntryButtonSchema = z
  .object({
    emoji: z.string().min(1),
    label: z.string().min(1),
    select_command: z.string().min(1),
  })
  .strict()

const EmojiBackButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
  })
  .strict()

const EmojiSelectorDeckSchema = z
  .object({
    favorites: z.array(z.string().min(1)).default([]),
    select_command: z.string().min(1),
  })
  .strict()

const EMOJI_ICON_ASSETS: Record<string, string> = {
  '\u{1F300}': 'addon://emoji-selector/emoji-rainbow.svg',
  '\u{1F30A}': 'addon://emoji-selector/emoji-wave.svg',
  '\u{1F333}': 'addon://emoji-selector/emoji-leaf.svg',
  '\u{1F34D}': 'addon://emoji-selector/emoji-berry.svg',
  '\u{1F355}': 'addon://emoji-selector/emoji-pizza.svg',
  '\u{1F363}': 'addon://emoji-selector/emoji-sushi.svg',
  '\u{1F389}': 'addon://emoji-selector/emoji-party.svg',
  '\u{1F525}': 'addon://emoji-selector/emoji-fire.svg',
  '\u{1F600}': 'addon://emoji-selector/emoji-grin.svg',
  '\u{1F602}': 'addon://emoji-selector/emoji-joy.svg',
  '\u{1F60E}': 'addon://emoji-selector/emoji-cool.svg',
  '\u{2615}': 'addon://emoji-selector/emoji-coffee.svg',
}

function getEmojiFallbackLabel(emoji: string): string {
  const mapped = {
    '\u{1F300}': 'RAIN',
    '\u{1F30A}': 'WAVE',
    '\u{1F333}': 'LEAF',
    '\u{1F34D}': 'BERRY',
    '\u{1F355}': 'PIZZA',
    '\u{1F363}': 'SUSHI',
    '\u{1F389}': 'PARTY',
    '\u{1F525}': 'FIRE',
    '\u{1F600}': 'GRIN',
    '\u{1F602}': 'JOY',
    '\u{1F60E}': 'COOL',
    '\u{2615}': 'COFFEE',
  }[emoji]
  if (mapped) {
    return mapped
  }

  const codePoints = Array.from(emoji, (symbol) =>
    symbol.codePointAt(0)?.toString(16).toUpperCase(),
  ).filter((codePoint): codePoint is string => codePoint !== undefined)

  return codePoints[0] ? `U+${codePoints[0]}` : 'EMOJI'
}

function createButtonNode(keyIndex: number, label: string, icon?: string) {
  return createElement('deck-button', {
    ...(icon !== undefined ? { icon } : {}),
    keyIndex,
    label,
  })
}

const emojiCategoryButton = {
  configSchema: EmojiCategoryButtonSchema,
  createInstance: ({
    button,
    config,
    methods,
  }: {
    button: { position: number }
    config: z.infer<typeof EmojiCategoryButtonSchema>
    methods: { navigateToDeck: (deckId: string) => Promise<void> | void }
  }) => ({
    onTap: async () => {
      await methods.navigateToDeck(config.target_deck)
    },
    render: () => createButtonNode(button.position, config.label, config.icon),
  }),
  type: 'emoji-category-button',
}

const emojiEntryButton = {
  configSchema: EmojiEntryButtonSchema,
  createInstance: ({
    button,
    config,
    methods,
  }: {
    button: { position: number }
    config: z.infer<typeof EmojiEntryButtonSchema>
    methods: { runCommand: (command: string) => Promise<unknown> }
  }) => ({
    onTap: async () => {
      await methods.runCommand(
        config.select_command
          .replaceAll('{{emoji}}', config.emoji)
          .replaceAll('{{label}}', config.label),
      )
    },
    render: () =>
      createElement('deck-button', {
        ...(EMOJI_ICON_ASSETS[config.emoji] !== undefined
          ? { icon: EMOJI_ICON_ASSETS[config.emoji] }
          : {}),
        keyIndex: button.position,
        label: getEmojiFallbackLabel(config.emoji),
        subtitle: config.label,
        ...(EMOJI_ICON_ASSETS[config.emoji] === undefined
          ? { variant: 'emoji' as const }
          : {}),
      }),
  }),
  type: 'emoji-entry-button',
}

const emojiBackButton = {
  configSchema: EmojiBackButtonSchema,
  createInstance: ({
    button,
    config,
    methods,
  }: {
    button: { position: number }
    config: z.infer<typeof EmojiBackButtonSchema>
    methods: { goBack: () => Promise<void> | void }
  }) => ({
    onTap: async () => {
      await methods.goBack()
    },
    render: () => createButtonNode(button.position, config.label, config.icon),
  }),
  type: 'emoji-back-button',
}

const emojiSelectorDeck = {
  configSchema: EmojiSelectorDeckSchema,
  createDecks: ({
    config,
    deck,
  }: {
    config: z.infer<typeof EmojiSelectorDeckSchema>
    deck: { id: string }
  }) => {
    const categoryDecks = CATEGORY_DEFINITIONS.map((category) => ({
      ...category,
      deckId: `${deck.id}-${category.id}`,
    }))

    const orderedCategories =
      config.favorites.length > 0
        ? [
            {
              deckId: `${deck.id}-favorites`,
              emojis: config.favorites,
              icon: 'addon://emoji-selector/favorites.svg',
              id: 'favorites',
              label: 'Favorites',
            },
            ...categoryDecks,
          ]
        : categoryDecks

    const generatedDecks = Object.fromEntries(
      orderedCategories.map((category) => [
        category.deckId,
        {
          buttons: [
            ...category.emojis.map((emoji, index) => ({
              emoji,
              label: category.label,
              position: index,
              select_command: config.select_command,
              type: 'emoji-entry-button',
            })),
            {
              icon: 'addon://emoji-selector/back.svg',
              label: 'Back',
              position: 14,
              type: 'emoji-back-button',
            },
          ],
          id: category.deckId,
          name: category.label,
        },
      ]),
    )

    return {
      [deck.id]: {
        buttons: [
          ...orderedCategories.map((category, index) => ({
            icon: category.icon,
            label: category.label,
            position: index,
            target_deck: category.deckId,
            type: 'emoji-category-button',
          })),
          {
            icon: 'addon://emoji-selector/back.svg',
            label: 'Back',
            position: 14,
            type: 'emoji-back-button',
          },
        ],
        id: deck.id,
        name: 'Emoji Selector',
      },
      ...generatedDecks,
    }
  },
  type: 'emoji-selector',
}

const emojiSelectorAddon: SirenoAddon = {
  apiVersion: 1,
  assets,
  buttons: [emojiCategoryButton, emojiEntryButton, emojiBackButton],
  decks: [emojiSelectorDeck],
  name: 'emoji-selector',
}

export default emojiSelectorAddon
