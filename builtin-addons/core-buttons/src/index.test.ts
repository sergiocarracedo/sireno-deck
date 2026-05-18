import { describe, expect, it, vi } from "vitest"

import { createAddonRegistry } from "../../../packages/cli/src/addon/registry.js"
import coreButtonsAddon from "./index.js"

describe("core-buttons addon", () => {
  it("exports a bundled display button definition with a zod schema", () => {
    expect(coreButtonsAddon.name).toBe("core-buttons")
    expect(coreButtonsAddon.apiVersion).toBe(1)
    expect(coreButtonsAddon.assets).toHaveProperty("clock.svg")
    expect(coreButtonsAddon.wrappers).toEqual([{ name: "shared-card", wrapper: "shared" }])
    expect(coreButtonsAddon.styles).toEqual([{ name: "accent", shared: { tone: "accent" } }])

    const definition = coreButtonsAddon.buttons[0]
    const config = definition?.configSchema.parse({ label: "Clock" })

    expect(definition?.type).toBe("display-text")
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
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "change-deck")
    const navigateToDeck = vi.fn()
    const instance = definition?.createInstance({
      button: { position: 4 },
      config: { label: "Emoji", target_deck: "emoji" },
      methods: { navigateToDeck },
    } as never)

    await instance?.onTap?.()

    expect(navigateToDeck).toHaveBeenCalledWith("emoji")
  })

  it("registers bundled wrapper and style primitives through the shared addon registry contract", () => {
    const registry = createAddonRegistry()
    registry.registerAddon(coreButtonsAddon)

    expect(registry.getWrapperPrimitive("core-buttons/shared-card")).toEqual({
      addonName: "core-buttons",
      id: "core-buttons/shared-card",
      name: "shared-card",
      wrapper: "shared",
    })
    expect(registry.getStylePrimitive("core-buttons/accent")).toEqual({
      addonName: "core-buttons",
      id: "core-buttons/accent",
      name: "accent",
      shared: { tone: "accent" },
    })
  })
})
