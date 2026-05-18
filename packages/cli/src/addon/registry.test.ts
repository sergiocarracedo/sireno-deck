import { describe, expect, it } from "vitest"
import { z } from "zod"

import { createAddonRegistry } from "./registry.js"

describe("createAddonRegistry", () => {
  it("registers addon button definitions and looks them up by type", () => {
    const registry = createAddonRegistry()
    const buttonDefinition = {
      configSchema: z.object({ label: z.string().min(1) }),
      createInstance: () => ({ render: () => null as never }),
      type: "test-display",
    }

    registry.registerAddon({
      apiVersion: 1,
      buttons: [buttonDefinition],
      name: "test-addon",
    })

    expect(registry.getButton("test-display")).toBe(buttonDefinition)
    expect(registry.listButtons()).toEqual([buttonDefinition])
  })

  it("rejects duplicate button type registration", () => {
    const registry = createAddonRegistry()
    const buttonDefinition = {
      configSchema: z.object({ label: z.string().min(1) }),
      createInstance: () => ({ render: () => null as never }),
      type: "duplicate-type",
    }

    registry.registerButton(buttonDefinition)

    expect(() => {
      registry.registerButton(buttonDefinition)
    }).toThrow("Button type 'duplicate-type' is already registered")
  })

  it("registers addon wrapper and style primitives under namespaced ids", () => {
    const registry = createAddonRegistry()

    registry.registerAddon({
      apiVersion: 1,
      buttons: [],
      name: "test-addon",
      styles: [{ name: "accent", shared: { tone: "accent" } }],
      wrappers: [{ name: "shared-card", wrapper: "shared" }],
    })

    expect(registry.getWrapperPrimitive("test-addon/shared-card")).toEqual({
      addonName: "test-addon",
      id: "test-addon/shared-card",
      name: "shared-card",
      wrapper: "shared",
    })
    expect(registry.getStylePrimitive("test-addon/accent")).toEqual({
      addonName: "test-addon",
      id: "test-addon/accent",
      name: "accent",
      shared: { tone: "accent" },
    })
  })

  it("rejects duplicate wrapper primitive registration", () => {
    const registry = createAddonRegistry()

    registry.registerAddon({
      apiVersion: 1,
      buttons: [],
      name: "test-addon",
      wrappers: [{ name: "shared-card", wrapper: "shared" }],
    })

    expect(() => {
      registry.registerAddon({
        apiVersion: 1,
        buttons: [],
        name: "test-addon",
        wrappers: [{ name: "shared-card", wrapper: "shared" }],
      })
    }).toThrow("Wrapper primitive 'test-addon/shared-card' is already registered")
  })

  it("rejects duplicate style primitive registration", () => {
    const registry = createAddonRegistry()

    registry.registerAddon({
      apiVersion: 1,
      buttons: [],
      name: "test-addon",
      styles: [{ name: "accent", shared: { tone: "accent" } }],
    })

    expect(() => {
      registry.registerAddon({
        apiVersion: 1,
        buttons: [],
        name: "test-addon",
        styles: [{ name: "accent", shared: { tone: "default" } }],
      })
    }).toThrow("Style primitive 'test-addon/accent' is already registered")
  })

  it("rejects slash-separated local primitive names", () => {
    const registry = createAddonRegistry()

    expect(() => {
      registry.registerAddon({
        apiVersion: 1,
        buttons: [],
        name: "test-addon",
        wrappers: [{ name: "bad/name", wrapper: "shared" }],
      })
    }).toThrow("wrapper primitive name 'bad/name' must not contain '/'")
  })
})
