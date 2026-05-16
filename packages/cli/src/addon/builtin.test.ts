import { describe, expect, it } from "vitest"

import { getBundledAddons } from "./builtin.js"

describe("getBundledAddons", () => {
  it("returns bundled addons through the shared addon contract", () => {
    const addons = getBundledAddons()

    expect(addons).toHaveLength(3)
    expect(addons[0]).toMatchObject({
      apiVersion: 1,
      name: "core-buttons",
    })
    expect(addons[0]?.buttons.map((button) => button.type)).toContain("display-text")
    expect(addons[1]).toMatchObject({
      apiVersion: 1,
      name: "emoji-selector",
    })
    expect(addons[1]?.decks?.map((deck) => deck.type)).toContain("emoji-selector")
    expect(addons[2]).toMatchObject({
      apiVersion: 1,
      name: "date-time",
    })
  })
})
