import { z } from 'zod'

import type { SirenoAddon } from '../../addon/api.js'
import { emojiCategoryButton } from './buttons/category.js'
import { emojiEntryButton } from './buttons/entry.js'
import {
  assets,
  CATEGORY_DEFINITIONS,
  EMOJI_PAGE_SIZE,
  EmojiSelectorDeckSchema,
  generatePageLabel,
  paginateEmojis,
} from './support.js'

const EMOJI_KEY_COUNT = 15
const PREV_ICON = 'addon://emoji-selector/back.svg'
const NEXT_ICON = 'addon://emoji-selector/back.svg'
const FAVORITES_ICON = 'addon://emoji-selector/favorites.svg'

interface CategorySpec {
  deckIdPrefix: string
  emojis: readonly string[]
  icon: string
  id: string
  label: string
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
    const categoryDecks: CategorySpec[] = CATEGORY_DEFINITIONS.map(
      (category) => ({
        deckIdPrefix: `${deck.id}-${category.id}`,
        emojis: category.emojis,
        icon: category.icon,
        id: category.id,
        label: category.label,
      }),
    )

    const orderedCategories: CategorySpec[] =
      config.favorites.length > 0
        ? [
            {
              deckIdPrefix: `${deck.id}-favorites`,
              emojis: config.favorites,
              icon: FAVORITES_ICON,
              id: 'favorites',
              label: 'Favorites',
            },
            ...categoryDecks,
          ]
        : categoryDecks

    const generatedDecks: Record<
      string,
      {
        buttons: Array<Record<string, unknown>>
        id: string
        name: string
      }
    > = {}

    for (const category of orderedCategories) {
      const pages = paginateEmojis(category.emojis, EMOJI_PAGE_SIZE)
      const isMultiPage = pages.length > 1
      const baseDeckId = category.deckIdPrefix

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const isFirstPage = pageIndex === 0
        const isLastPage = pageIndex === pages.length - 1
        const page = pages[pageIndex]!

        const pageDeckId = isMultiPage
          ? `${baseDeckId}-p${pageIndex + 1}`
          : baseDeckId

        const buttons: Array<Record<string, unknown>> = []

        const emojiStart = 0
        page.emojis.forEach((emoji, offset) => {
          buttons.push({
            emoji,
            label: category.label,
            position: emojiStart + offset,
            select_command: config.select_command,
            type: 'emoji-entry-button',
          })
        })

        if (!isFirstPage) {
          const prevDeckId =
            pageIndex === 1
              ? baseDeckId
              : `${baseDeckId}-p${pageIndex}`
          buttons.push({
            icon: PREV_ICON,
            label: `\u2039 Page ${pageIndex + 1}`,
            position: EMOJI_KEY_COUNT - 3,
            target_deck: prevDeckId,
            type: 'change-deck',
          })
        }

        if (!isLastPage) {
          const nextDeckId = `${baseDeckId}-p${pageIndex + 2}`
          buttons.push({
            icon: NEXT_ICON,
            label: `Page ${pageIndex + 2} \u203a`,
            position: EMOJI_KEY_COUNT - 2,
            target_deck: nextDeckId,
            type: 'change-deck',
          })
        }

        generatedDecks[pageDeckId] = {
          buttons,
          id: pageDeckId,
          name: generatePageLabel(category.label, pageIndex, page.totalPages),
        }
      }
    }

    return {
      [deck.id]: {
        buttons: [
          ...orderedCategories.map((category, index) => ({
            icon: category.icon,
            label: category.label,
            position: index,
            target_deck: category.deckIdPrefix,
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
  buttons: [emojiCategoryButton, emojiEntryButton],
  decks: [emojiSelectorDeck],
  name: 'emoji-selector',
}

export default emojiSelectorAddon
