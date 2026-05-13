import { fileURLToPath } from "node:url"

import { createElement } from "react"
import { z } from "zod"

import type { SirenoAddon } from "../../../packages/cli/src/addon/api.js"

const CATEGORY_DEFINITIONS = [
  {
    emojis: ["😀", "😂", "🥳", "😎"],
    icon: "addon://emoji-selector/smileys.svg",
    id: "smileys",
    label: "Smileys",
  },
  {
    emojis: ["🌿", "🌊", "🔥", "🌈"],
    icon: "addon://emoji-selector/nature.svg",
    id: "nature",
    label: "Nature",
  },
  {
    emojis: ["🍕", "🍣", "☕", "🍓"],
    icon: "addon://emoji-selector/food.svg",
    id: "food",
    label: "Food",
  },
] as const

const assets = {
  "back.svg": fileURLToPath(new URL("../assets/back.svg", import.meta.url)),
  "favorites.svg": fileURLToPath(new URL("../assets/favorites.svg", import.meta.url)),
  "food.svg": fileURLToPath(new URL("../assets/food.svg", import.meta.url)),
  "nature.svg": fileURLToPath(new URL("../assets/nature.svg", import.meta.url)),
  "smileys.svg": fileURLToPath(new URL("../assets/smileys.svg", import.meta.url)),
}

const EmojiCategoryButtonSchema = z.object({
  icon: z.string().min(1).optional(),
  label: z.string().min(1),
  target_deck: z.string().min(1),
})
  .strict()

const EmojiEntryButtonSchema = z.object({
  emoji: z.string().min(1),
  label: z.string().min(1),
  select_command: z.string().min(1),
})
  .strict()

const EmojiBackButtonSchema = z.object({
  icon: z.string().min(1).optional(),
  label: z.string().min(1),
})
  .strict()

const EmojiSelectorDeckSchema = z.object({
  favorites: z.array(z.string().min(1)).default([]),
  select_command: z.string().min(1),
})
  .strict()

function createButtonNode(keyIndex: number, label: string, icon?: string) {
  return createElement("deck-button", {
    ...(icon !== undefined ? { icon } : {}),
    keyIndex,
    label,
  })
}

const emojiCategoryButton = {
  configSchema: EmojiCategoryButtonSchema,
  createInstance: ({ button, config, methods }: {
    button: { position: number }
    config: z.infer<typeof EmojiCategoryButtonSchema>
    methods: { navigateToDeck: (deckId: string) => Promise<void> | void }
  }) => ({
    onTap: async () => {
      await methods.navigateToDeck(config.target_deck)
    },
    render: () => createButtonNode(button.position, config.label, config.icon),
  }),
  type: "emoji-category-button",
}

const emojiEntryButton = {
  configSchema: EmojiEntryButtonSchema,
  createInstance: ({ button, config, methods }: {
    button: { position: number }
    config: z.infer<typeof EmojiEntryButtonSchema>
    methods: { runCommand: (command: string) => Promise<unknown> }
  }) => ({
    onTap: async () => {
      await methods.runCommand(
        config.select_command
          .replaceAll("{{emoji}}", config.emoji)
          .replaceAll("{{label}}", config.label),
      )
    },
    render: () => createElement("deck-button", {
      keyIndex: button.position,
      label: config.emoji,
      subtitle: config.label,
    }),
  }),
  type: "emoji-entry-button",
}

const emojiBackButton = {
  configSchema: EmojiBackButtonSchema,
  createInstance: ({ button, config, methods }: {
    button: { position: number }
    config: z.infer<typeof EmojiBackButtonSchema>
    methods: { goBack: () => Promise<void> | void }
  }) => ({
    onTap: async () => {
      await methods.goBack()
    },
    render: () => createButtonNode(button.position, config.label, config.icon),
  }),
  type: "emoji-back-button",
}

const emojiSelectorDeck = {
  configSchema: EmojiSelectorDeckSchema,
  createDecks: ({ config, deck }: { config: z.infer<typeof EmojiSelectorDeckSchema>; deck: { id: string } }) => {
    const categoryDecks = CATEGORY_DEFINITIONS.map((category) => ({
      ...category,
      deckId: `${deck.id}-${category.id}`,
    }))

    const orderedCategories = config.favorites.length > 0
      ? [{
          deckId: `${deck.id}-favorites`,
          emojis: config.favorites,
          icon: "addon://emoji-selector/favorites.svg",
          id: "favorites",
          label: "Favorites",
        }, ...categoryDecks]
      : categoryDecks

    const generatedDecks = Object.fromEntries(orderedCategories.map((category) => [
      category.deckId,
      {
        buttons: [
          ...category.emojis.map((emoji, index) => ({
            emoji,
            label: category.label,
            position: index,
            select_command: config.select_command,
            type: "emoji-entry-button",
          })),
          {
            icon: "addon://emoji-selector/back.svg",
            label: "Back",
            position: 14,
            type: "emoji-back-button",
          },
        ],
        id: category.deckId,
        name: category.label,
      },
    ]))

    return {
      [deck.id]: {
        buttons: orderedCategories.map((category, index) => ({
          icon: category.icon,
          label: category.label,
          position: index,
          target_deck: category.deckId,
          type: "emoji-category-button",
        })),
        id: deck.id,
        name: "Emoji Selector",
      },
      ...generatedDecks,
    }
  },
  type: "emoji-selector",
}

const emojiSelectorAddon: SirenoAddon = {
  apiVersion: 1,
  assets,
  buttons: [emojiCategoryButton, emojiEntryButton, emojiBackButton],
  decks: [emojiSelectorDeck],
  name: "emoji-selector",
}

export default emojiSelectorAddon
