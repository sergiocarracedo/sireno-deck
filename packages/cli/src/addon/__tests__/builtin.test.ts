import { describe, expect, it } from "vitest"

import { getBundledAddons } from "../builtin"

describe("getBundledAddons", () => {
  it("returns bundled addons through the shared addon contract", () => {
    const addons = getBundledAddons()

    expect(addons).toHaveLength(9)
    expect(addons[0]).toMatchObject({
      apiVersion: 1,
      name: "core-buttons",
    })
    expect(addons[0]?.buttons.map((button) => button.type)).toContain("action")
    expect(addons[1]).toMatchObject({
      apiVersion: 1,
      name: "emoji-selector",
    })
    expect(addons[1]?.decks?.map((deck) => deck.type)).toContain("emoji-selector")
    expect(addons[2]).toMatchObject({
      apiVersion: 1,
      name: "date-time",
    })
    expect(addons[3]).toMatchObject({
      apiVersion: 1,
      name: "system-status",
    })
    expect(addons[3]?.buttons.map((button) => button.type)).toEqual([
      "system-status",
    ])
    expect(addons[5]).toMatchObject({
      apiVersion: 1,
      name: 'media-player',
    })
    expect(addons[5]?.buttons.map((button) => button.type)).toContain(
      'media-player',
    )
  })
})
