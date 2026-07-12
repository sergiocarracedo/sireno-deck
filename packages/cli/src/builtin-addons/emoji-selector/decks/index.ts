import type { AddonGeneratedDeck, AddonDeckDefinition } from "@/addon/api"

import {
  CATEGORY_DEFINITIONS,
  EmojiSelectorDeckSchema,
  type EmojiSelectorDeckConfig,
} from "../support"

const generateDecks = (
  deck: { id: string },
  config: EmojiSelectorDeckConfig,
): Record<string, AddonGeneratedDeck> => {
  const decks: Record<string, AddonGeneratedDeck> = {}
  const categories = [
    ...(config.favorites.length > 0
      ? [
          {
            id: "favorites",
            label: "Favorites",
            icon: "⭐",
            emojis: config.favorites,
          },
        ]
      : []),
    ...CATEGORY_DEFINITIONS.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      emojis: c.emojis,
    })),
  ]

  const topButtons: {
    type: string
    icon: string
    label: string
    position: number
    target_deck: string
  }[] = []
  const EMOJI_PAGE_SIZE = 13
  categories.forEach((category, idx) => {
    const categoryDeckId = `${deck.id}-${category.id}`
    const totalPages = Math.max(1, Math.ceil(category.emojis.length / EMOJI_PAGE_SIZE))
    const targetDeck = totalPages > 1 ? `${categoryDeckId}-p1` : categoryDeckId
    topButtons.push({
      icon: category.icon,
      label: category.label,
      position: idx,
      target_deck: targetDeck,
      type: "emoji-selector:category",
    })
    const buttons = category.emojis.map((emoji, offset) => ({
      type: "emoji-selector:emoji",
      emoji,
      label: emoji,
      position: offset,
    }))
    decks[categoryDeckId] = {
      name: category.label,
      buttons,
      paginated: true,
    }
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
