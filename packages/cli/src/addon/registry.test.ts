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

})
