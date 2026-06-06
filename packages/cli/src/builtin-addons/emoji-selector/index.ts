import { z } from 'zod'

import type { SirenoAddon } from '../../addon/api.js'
import { emojiBackButton } from './buttons/back.js'
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
const FAVORITES_ICON = 'addon://emoji-selector/favorites.svg'

interface CategorySpec {
  deckIdPrefix: string
  emojis: readonly string[]
  icon: string
  id: string
  label: string
}

function buildPageNavButton(
  isFirstPage: boolean,
  isLastPage: boolean,
  prevDeckId: string,
  nextDeckId: string,
  currentDeckId: string,
) {
  const tapTarget = isLastPage ? currentDeckId : nextDeckId
  const doubleTapTarget = isFirstPage ? currentDeckId : prevDeckId
  return {
    label: 'Page',
    meta: 'page-nav',
    position: EMOJI_KEY_COUNT - 2,
    target_deck: tapTarget,
    target_deck_double_tap: doubleTapTarget,
    type: 'change-deck',
  }
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

        if (isFirstPage) {
          firstPageDeckIds.push(pageDeckId)
        }

        const buttons: Array<Record<string, unknown>> = []

        page.emojis.forEach((emoji, offset) => {
          buttons.push({
            emoji,
            label: category.label,
            position: offset,
            select_command: config.select_command,
            type: 'emoji-entry-button',
          })
        })

        if (isMultiPage) {
          const prevDeckId = `${baseDeckId}-p${pageIndex}`
          const nextDeckId = `${baseDeckId}-p${pageIndex + 2}`
          buttons.push(
            buildPageNavButton(
              isFirstPage,
              isLastPage,
              prevDeckId,
              nextDeckId,
              pageDeckId,
            ),
          )
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
            target_deck: firstPageDeckIds[index],
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
