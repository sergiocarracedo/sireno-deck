import { describe, expect, it, vi } from "vitest"

import emojiSelectorAddon from "./index.js"

describe("emoji-selector addon", () => {
  it("exports emoji decks with favorites-first category navigation", () => {
    expect(emojiSelectorAddon.name).toBe("emoji-selector")
    expect(emojiSelectorAddon.assets).toHaveProperty("favorites.svg")

    const deckDefinition = emojiSelectorAddon.decks?.[0]
    const decks = deckDefinition?.createDecks({
      config: { favorites: ["🔥", "🍕"], select_command: "printf '%s' '{{emoji}}'" },
      deck: { id: "emoji", type: "emoji-selector" },
    })

    expect(decks?.emoji?.buttons[0]).toMatchObject({
      label: "Favorites",
      target_deck: "emoji-favorites",
      type: "emoji-category-button",
    })
    expect(decks?.["emoji-favorites"]?.buttons[0]).toMatchObject({
      emoji: "🔥",
      label: "Favorites",
      type: "emoji-entry-button",
    })
  })

  it("runs the select command with the chosen emoji", async () => {
    const entryDefinition = emojiSelectorAddon.buttons.find((button) => button.type === "emoji-entry-button")
    const runCommand = vi.fn()
    const instance = entryDefinition?.createInstance({
      button: { position: 2 },
      config: { emoji: "😀", label: "Smileys", select_command: "printf '%s' '{{emoji}}'" },
      methods: { runCommand },
    } as never)

    await instance?.onTap?.()

    expect(runCommand).toHaveBeenCalledWith("printf '%s' '😀'")
  })
})
