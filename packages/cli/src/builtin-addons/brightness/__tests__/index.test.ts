import { describe, expect, it } from "vitest"

import brightnessAddon from ".."

describe("brightness addon", () => {
  it("exports a SirenoAddon with the expected shape", () => {
    expect(brightnessAddon.name).toBe("brightness")
    expect(brightnessAddon.apiVersion).toBe(1)
    expect(brightnessAddon.buttons.map((button) => button.type)).toEqual([
      "brightness",
    ])
  })
})
