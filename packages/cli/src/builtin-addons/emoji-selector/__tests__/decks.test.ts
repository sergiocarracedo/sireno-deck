import { describe, expect, it } from "vitest"

import emojiSelectorDeckFactory from "../decks"

const createDeck = (config: unknown = { favorites: [] }) =>
  emojiSelectorDeckFactory.createDecks({
    config,
    deck: { id: "emoji-selector" },
  })

const topButtons = (config: unknown) =>
  createDeck(config)["emoji-selector"].buttons as Array<{
    type: string
    position: number
    label: string
    icon: string
    target_deck: string
  }>

describe("emoji-selector decks — favorites as a dedicated entry", () => {
  it("does not emit a favorites deck when favorites is empty", () => {
    const decks = createDeck({ favorites: [] })
    expect(decks["emoji-selector-favorites"]).toBeUndefined()
  })

  it("does not include a Favorites entry on the top deck when favorites is empty", () => {
    const buttons = topButtons({ favorites: [] })
    expect(buttons.find((b) => b.label === "Favorites")).toBeUndefined()
  })

  it("places category buttons at positions 0..7 when favorites is empty", () => {
    const buttons = topButtons({ favorites: [] })
    expect(buttons).toHaveLength(8)
    expect(buttons.map((b) => b.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(buttons[0]?.label).toBe("Smileys")
    expect(buttons[1]?.label).toBe("Nature")
  })

  it("emits a favorites deck only when favorites has entries", () => {
    const decks = createDeck({ favorites: ["🦄"] })
    expect(decks["emoji-selector-favorites"]).toBeDefined()
    expect(decks["emoji-selector-favorites"].paginated).toBe(true)
  })

  it("places the Favorites entry at position 0 on the top deck", () => {
    const buttons = topButtons({ favorites: ["🦄"] })
    expect(buttons[0]?.label).toBe("Favorites")
    expect(buttons[0]?.position).toBe(0)
    expect(buttons[0]?.icon).toBe("⭐")
    expect(buttons[0]?.target_deck).toBe("emoji-selector-favorites")
  })

  it("shifts category buttons to positions 1..8 when favorites is present", () => {
    const buttons = topButtons({ favorites: ["🦄"] })
    expect(buttons).toHaveLength(9)
    expect(buttons.map((b) => b.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(buttons[1]?.label).toBe("Smileys")
    expect(buttons[8]?.label).toBe("Flags")
  })

  it("routes favorites to first page when paginated, otherwise the base deck", () => {
    const manyFav = Array.from({ length: 14 }, (_, i) => `e${i}`)
    const manyButtons = topButtons({ favorites: manyFav })
    expect(manyButtons[0]?.target_deck).toBe("emoji-selector-favorites-p1")

    const oneFav = topButtons({ favorites: ["🦄"] })
    expect(oneFav[0]?.target_deck).toBe("emoji-selector-favorites")
  })
})

describe("emoji-selector decks — category layout", () => {
  it("always emits one deck per category id", () => {
    const decks = createDeck({ favorites: [] })
    const categoryDeckIds = Object.keys(decks).filter((id) =>
      id.startsWith("emoji-selector-"),
    )
    expect(categoryDeckIds).toContain("emoji-selector-smileys")
    expect(categoryDeckIds).toContain("emoji-selector-nature")
    expect(categoryDeckIds).toContain("emoji-selector-food")
    expect(categoryDeckIds).toContain("emoji-selector-activities")
    expect(categoryDeckIds).toContain("emoji-selector-travel")
    expect(categoryDeckIds).toContain("emoji-selector-objects")
    expect(categoryDeckIds).toContain("emoji-selector-symbols")
    expect(categoryDeckIds).toContain("emoji-selector-flags")
  })

  it("category decks are paginated: true so paginate-deck emits page-nav buttons", () => {
    const decks = createDeck({ favorites: [] })
    expect(decks["emoji-selector-smileys"].paginated).toBe(true)
    expect(decks["emoji-selector-flags"].paginated).toBe(true)
  })

  it("category deck buttons use type: emoji-selector:emoji", () => {
    const decks = createDeck({ favorites: [] })
    const buttons = decks["emoji-selector-smileys"].buttons as Array<{
      type: string
      emoji: string
    }>
    expect(buttons[0]?.type).toBe("emoji-selector:emoji")
    expect(buttons[0]?.emoji).toBe("😀")
  })

  it("category button target_deck routes to first page when paginated", () => {
    const buttons = topButtons({ favorites: [] })
    const smileys = buttons.find((b) => b.label === "Smileys")
    expect(smileys?.target_deck).toBe("emoji-selector-smileys-p1")
  })
})
