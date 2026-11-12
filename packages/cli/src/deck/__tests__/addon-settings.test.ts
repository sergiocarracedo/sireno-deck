import { describe, expect, it } from "vitest"
import { buildAddonSettingsDecks } from "../addon-settings"

describe("addon settings decks", () => {
  const settings = {
    id: "internal-settings:settings",
    name: "Settings",
    buttons: [],
  }
  const entries = Array.from({ length: 5 }, (_, i) => ({
    name: `addon${i}`,
    settings: {
      label: `Addon ${i}`,
      icon: "icon://settings",
      deck: `addon${i}:settings`,
    },
  }))

  it("repeats compact system controls while paginating addon entries on a six-key device", () => {
    const decks = buildAddonSettingsDecks([settings], entries, 6)
    expect(decks).toHaveLength(3)
    for (const deck of decks) {
      expect(deck.buttons.map((button) => button.type)).toContain(
        "internal-settings:compact-brightness",
      )
      expect(deck.buttons.map((button) => button.type)).toContain(
        "internal-settings:compact-app-info",
      )
      expect(deck.buttons.map((button) => button.type)).toContain(
        "core:page-nav",
      )
      expect(
        deck.buttons.filter((button) => button.type === "core:change-deck")
          .length,
      ).toBeGreaterThan(0)
      expect(new Set(deck.buttons.map((button) => button.position)).size).toBe(
        deck.buttons.length,
      )
    }
    expect(decks[0]?.id).toBe("internal-settings:settings")
    expect(
      decks[0]?.buttons.find((button) => button.type === "core:page-nav")
        ?.config,
    ).toMatchObject({ nextDeckId: decks[1]?.id })
  })

  it("uses separate system controls on larger devices", () => {
    const [deck] = buildAddonSettingsDecks([settings], entries, 15)
    expect(deck?.buttons.slice(0, 3).map((button) => button.type)).toEqual([
      "internal-settings:app-info",
      "internal-settings:brightness-down",
      "internal-settings:brightness-up",
    ])
    expect(
      deck?.buttons.filter((button) => button.type === "core:change-deck"),
    ).toHaveLength(5)
  })
})
