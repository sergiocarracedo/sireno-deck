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

  it("renders bundled icon-backed emoji entry buttons for shipped emoji values", () => {
    const entryDefinition = emojiSelectorAddon.buttons.find((button) => button.type === "emoji-entry-button")
    const instance = entryDefinition?.createInstance({
      button: { position: 2 },
      config: { emoji: "😀", label: "Smileys", select_command: "printf '%s' '{{emoji}}'" },
      methods: { runCommand: vi.fn() },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: {
        icon: expect.stringContaining("emoji-grin.svg"),
        keyIndex: 2,
        label: "GRIN",
        subtitle: "Smileys",
      },
    })
  })

  it("keeps an explicit text fallback for unsupported emoji values", () => {
    const entryDefinition = emojiSelectorAddon.buttons.find((button) => button.type === "emoji-entry-button")
    const instance = entryDefinition?.createInstance({
      button: { position: 4 },
      config: { emoji: "🛰️", label: "Custom", select_command: "printf '%s' '{{emoji}}'" },
      methods: { runCommand: vi.fn() },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: {
        keyIndex: 4,
        label: "U+1F6F0",
        subtitle: "Custom",
        variant: "emoji",
      },
    })
  })
})
