import type { AddonGeneratedDeck, AddonDeckDefinition } from "@/addon/api"

import {
  CATEGORY_DEFINITIONS,
  EmojiSelectorDeckSchema,
  type EmojiSelectorDeckConfig,
} from "../support"

const EMOJI_PAGE_SIZE = 13

const FAVORITES = {
  id: "favorites",
  label: "Favorites",
  icon: "⭐",
} as const

const buildCategoryDeckId = (baseDeckId: string, categoryId: string): string =>
  `${baseDeckId}-${categoryId}`

const buildEmojiDeck = (name: string, emojis: readonly string[]) => ({
  name,
  buttons: emojis.map((emoji, offset) => ({
    type: "emoji-selector:emoji",
    emoji,
    label: emoji,
    position: offset,
    actions: { tap: `paste://${emoji}` },
  })),
  paginated: true,
})

const generateDecks = (
  deck: { id: string },
  config: EmojiSelectorDeckConfig,
): Record<string, AddonGeneratedDeck> => {
  const decks: Record<string, AddonGeneratedDeck> = {}
  const hasFavorites = config.favorites.length > 0

  if (hasFavorites) {
    const favoritesDeckId = buildCategoryDeckId(deck.id, FAVORITES.id)
    decks[favoritesDeckId] = buildEmojiDeck(FAVORITES.label, config.favorites)
  }

  const topButtons: {
    type: string
    icon: string
    label: string
    position: number
    target_deck: string
  }[] = []

  if (hasFavorites) {
    const favoritesDeckId = buildCategoryDeckId(deck.id, FAVORITES.id)
    const totalPages = Math.max(
      1,
      Math.ceil(config.favorites.length / EMOJI_PAGE_SIZE),
    )
    topButtons.push({
      type: "emoji-selector:category",
      icon: FAVORITES.icon,
      label: FAVORITES.label,
      position: 0,
      target_deck: totalPages > 1 ? `${favoritesDeckId}-p1` : favoritesDeckId,
    })
  }

  CATEGORY_DEFINITIONS.forEach((category, idx) => {
    const categoryDeckId = buildCategoryDeckId(deck.id, category.id)
    const totalPages = Math.max(
      1,
      Math.ceil(category.emojis.length / EMOJI_PAGE_SIZE),
    )
    decks[categoryDeckId] = buildEmojiDeck(category.label, category.emojis)
    topButtons.push({
      type: "emoji-selector:category",
      icon: category.icon,
      label: category.label,
      position: hasFavorites ? idx + 1 : idx,
      target_deck: totalPages > 1 ? `${categoryDeckId}-p1` : categoryDeckId,
    })
  })

  decks[deck.id] = {
    name: "Emoji Selector",
    buttons: topButtons,
  }

  return decks
}

const emojiSelectorDeckDefinition: AddonDeckDefinition = {
  type: "emoji-selector",
  createDecks: ({
    config,
  }: {
    config: unknown
    deck: { id: string }
  }): Record<string, AddonGeneratedDeck> => {
    const cfg =
      config && typeof config === "object" && "favorites" in config
        ? (config as EmojiSelectorDeckConfig)
        : { favorites: [] }
    return generateDecks({ id: "emoji-selector" }, cfg)
  },
}

export default emojiSelectorDeckDefinition
export {
  emojiSelectorDeckDefinition as emojiSelectorDeckFactory,
  EmojiSelectorDeckSchema,
}
