import type { AddonDeckEntry, AddonGeneratedDeck } from "@/addon/api"

import { categories, Emoji } from "../data/categories"
import {
  DEFAULT_FAVORITES,
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

const buildEmojiDeck = (name: string, emojis: readonly Emoji[]) => {
  return {
    name,
    buttons: emojis.map((emoji, offset) => ({
      type: "emoji-selector:emoji",
      emoji: emoji.char,
      shortcode: emoji.shortcode,
      position: offset,
      actions: {
        tap: `type://${emoji.char}`,
        ...(emoji.shortcode ? { dbltap: `type://:${emoji.shortcode}:` } : {}),
      },
    })),
    paginated: true,
  }
}

const generateDecks = (
  deck: { id: string },
  config: EmojiSelectorDeckConfig,
): Record<string, AddonGeneratedDeck> => {
  const decks: Record<string, AddonGeneratedDeck> = {}
  const favorites = (
    config.favorites.length > 0 ? config.favorites : [...DEFAULT_FAVORITES]
  ).map((emoji) => ({
    char: emoji,
  }))

  const favoritesDeckId = buildCategoryDeckId(deck.id, FAVORITES.id)
  decks[favoritesDeckId] = buildEmojiDeck(FAVORITES.label, favorites)

  const topButtons: {
    type: string
    icon: string
    label: string
    position: number
    target_deck: string
  }[] = []

  const favTotalPages = Math.max(
    1,
    Math.ceil(favorites.length / EMOJI_PAGE_SIZE),
  )
  topButtons.push({
    type: "emoji-selector:category",
    icon: FAVORITES.icon,
    label: FAVORITES.label,
    position: 0,
    target_deck: favTotalPages > 1 ? `${favoritesDeckId}-p1` : favoritesDeckId,
  })

  categories.forEach((category, idx) => {
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
      position: idx + 1,
      target_deck: totalPages > 1 ? `${categoryDeckId}-p1` : categoryDeckId,
    })
  })

  decks[deck.id] = {
    name: "Emoji Selector",
    buttons: topButtons,
    paginated: true,
  }

  return decks
}

// ponytail: phase 11 array form. The factory takes the addon's
// runtime config (favorites override) and produces the multi-dynamic
// record keyed by deck id. Each generated deck id is the run-time
// identifier — `emoji-selector` is the launcher; `emoji-selector-<category>`
// are the category drill-downs; the synthetic multi key isn't used
// here because the factory has a fixed id.
const emojiSelectorDeckEntry: AddonDeckEntry = {
  createDecks: ({
    config,
  }: {
    config: unknown
    deck: { id: string }
    keyCount: number
  }): Record<string, AddonGeneratedDeck> => {
    const cfg =
      config && typeof config === "object" && "favorites" in config
        ? (config as EmojiSelectorDeckConfig)
        : { favorites: [] }
    return generateDecks({ id: "emoji-selector" }, cfg)
  },
}

export default emojiSelectorDeckEntry
export {
  emojiSelectorDeckEntry as emojiSelectorDeckFactory,
  EmojiSelectorDeckSchema,
}
