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

  it("exports a bundled toggle definition with the internal-mode schema", () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const config = definition?.configSchema.parse({
      label: "Desk Lamp",
      mode: "internal",
      on: { subtitle: "ON" },
    })

    expect(definition?.type).toBe("toggle")
    expect(config).toEqual({
      initial_state: "off",
      label: "Desk Lamp",
      mode: "internal",
      on: { subtitle: "ON" },
    })
  })

  it("creates a renderable internal toggle instance", () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const instance = definition?.createInstance({
      button: { position: 6 },
      config: {
        initial_state: "on",
        label: "Desk Lamp",
        mode: "internal",
        on: { subtitle: "ON" },
      },
      methods: { invalidate: vi.fn() },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: {
        keyIndex: 6,
        label: "Desk Lamp",
        subtitle: "ON",
        toggle_mode: "internal",
        variant: "toggle",
      },
      type: "deck-button",
    })
  })

  it("toggles internal state and invalidates on tap", async () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const invalidate = vi.fn()
    const instance = definition?.createInstance({
      button: { position: 7 },
      config: {
        initial_state: "off",
        label: "Desk Lamp",
        mode: "internal",
        off: { subtitle: "OFF" },
        on: { subtitle: "ON" },
      },
      methods: { invalidate },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 7, label: "Desk Lamp", subtitle: "OFF", toggle_mode: "internal", variant: "toggle" },
    })

    await instance?.onTap?.()

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 7, label: "Desk Lamp", subtitle: "ON", toggle_mode: "internal", variant: "toggle" },
    })
  })
})
