import { z } from 'zod'

import type { SirenoAddon } from '../../addon/api.js'
import { emojiBackButton } from './buttons/back.js'
import { emojiCategoryButton } from './buttons/category.js'
import { emojiEntryButton } from './buttons/entry.js'
import { assets, CATEGORY_DEFINITIONS, EmojiSelectorDeckSchema } from './support.js'

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
