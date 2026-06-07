import { z } from 'zod'

import type { SirenoAddon } from '@/addon/api'
import { buildPageNavButton, paginateDecks } from '@/core/pagination'
import { emojiBackButton } from './buttons/back'
import { emojiCategoryButton } from './buttons/category'
import { emojiEntryButton } from './buttons/entry'
import { emojiLauncherButton } from './buttons/launcher'
import {
  assets,
  CATEGORY_DEFINITIONS,
  EMOJI_PAGE_SIZE,
  EmojiSelectorDeckSchema,
  generatePageLabel,
} from './support'

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
    const firstPageDeckIds: string[] = []

    for (const category of orderedCategories) {
      const baseDeckId = category.deckIdPrefix
      const pages = paginateDecks({
        baseDeckId,
        pageSize: EMOJI_PAGE_SIZE,
        totalItems: category.emojis.length,
      })
      const isMultiPage = pages.length > 1

      for (const page of pages) {
        const pageDeckId = isMultiPage ? page.deckId : baseDeckId
        const isFirstPage = page.pageNumber === 1
        const pageEmojis = category.emojis.slice(
          page.startIndex,
          page.endIndex + 1,
        )

        if (isFirstPage) {
          firstPageDeckIds.push(pageDeckId)
        }

        const buttons: Array<Record<string, unknown>> = []

        pageEmojis.forEach((emoji, offset) => {
          buttons.push({
            emoji,
            label: category.label,
            position: offset,
            select_command: config.select_command,
            type: 'emoji-emoji-button',
          })
        })

        if (isMultiPage) {
          const prevDeckId = page.pageNumber > 1 ? `${baseDeckId}-p${page.pageNumber - 1}` : null
          const nextDeckId = page.pageNumber < pages.length
            ? `${baseDeckId}-p${page.pageNumber + 1}`
            : null
          buttons.push(
            buildPageNavButton(
              page.pageNumber,
              pages.length,
              prevDeckId,
              nextDeckId,
            ),
          )
        }

        generatedDecks[pageDeckId] = {
          buttons,
          id: pageDeckId,
          name: generatePageLabel(category.label, page.pageNumber - 1, pages.length),
        }
      }
    }

    return {
      [deck.id]: {
        buttons: orderedCategories.map((category, index) => ({
          icon: category.icon,
          label: category.label,
          position: index,
          target_deck: firstPageDeckIds[index],
          type: 'emoji-category-button',
        })),
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
  buttons: [
    emojiCategoryButton,
    emojiEntryButton,
    emojiLauncherButton,
    emojiBackButton,
  ],
  decks: [emojiSelectorDeck],
  name: 'emoji-selector',
}

export default emojiSelectorAddon
