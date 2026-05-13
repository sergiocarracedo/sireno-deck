import { describe, expect, it } from "vitest"

import { getBundledAddons } from "./builtin.js"

describe("getBundledAddons", () => {
  it("returns bundled addons through the shared addon contract", () => {
    const addons = getBundledAddons()

    expect(addons).toHaveLength(1)
    expect(addons[0]).toMatchObject({
      apiVersion: 1,
      name: "core-buttons",
    })
    expect(addons[0]?.buttons.map((button) => button.type)).toContain("builtin-display-text")
  })
})
