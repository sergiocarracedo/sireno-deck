import { describe, expect, it, vi } from "vitest"

import coreButtonsAddon from "./index.js"

describe("core-buttons addon", () => {
  it("exports a bundled display button definition with a zod schema", () => {
    expect(coreButtonsAddon.name).toBe("core-buttons")
    expect(coreButtonsAddon.apiVersion).toBe(1)
    expect(coreButtonsAddon.assets).toHaveProperty("clock.svg")

    const definition = coreButtonsAddon.buttons[0]
    const config = definition?.configSchema.parse({ label: "Clock" })

    expect(definition?.type).toBe("builtin-display-text")
    expect(config).toEqual({ label: "Clock" })
  })

  it("creates a renderable button instance", () => {
    const definition = coreButtonsAddon.buttons[0]
    const instance = definition?.createInstance({
      button: { position: 2 },
      config: { icon: "./clock.svg", label: "Clock" },
    })

    expect(instance?.render()).toMatchObject({
      props: {
        icon: "./clock.svg",
        keyIndex: 2,
        label: "Clock",
      },
      type: "deck-button",
    })
  })

  it("navigates with the bundled change-deck button", async () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "builtin-change-deck")
    const navigateToDeck = vi.fn()
    const instance = definition?.createInstance({
      button: { position: 4 },
      config: { label: "Emoji", target_deck: "emoji" },
      methods: { navigateToDeck },
    } as never)

    await instance?.onTap?.()

    expect(navigateToDeck).toHaveBeenCalledWith("emoji")
  })
})
