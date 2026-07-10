import { describe, expect, it } from "vitest"

import ActionButtonBackend from "../buttons/action/backend"
import ChangeDeckButtonBackend from "../buttons/change-deck/backend"
import ToggleButtonBackend from "../buttons/toggle/backend"
import { coreAddon } from "../index"

describe("core addon", () => {
  it("manifest declares apiVersion 1 and the expected name", () => {
    expect(coreAddon.apiVersion).toBe(1)
    expect(coreAddon.name).toBe("core")
  })

  it("action button configSchema requires at least icon or label", () => {
    const empty = ActionButtonBackend.configSchema.safeParse({})
    expect(empty.success).toBe(false)
    const iconOnly = ActionButtonBackend.configSchema.safeParse({ icon: "icon://play" })
    expect(iconOnly.success).toBe(true)
    const labelOnly = ActionButtonBackend.configSchema.safeParse({ label: "Run" })
    expect(labelOnly.success).toBe(true)
  })

  it("change-deck configSchema rejects empty deck", () => {
    const result = ChangeDeckButtonBackend.configSchema.safeParse({ deck: "" })
    expect(result.success).toBe(false)
  })

  it("toggle configSchema uses default false", () => {
    const result = ToggleButtonBackend.configSchema.safeParse({ key: "k" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.default).toBe(false)
  })

  it("sirenodeck.json points at the entry", async () => {
    const manifestJson = (
      await import("../sirenodeck.json", {
        with: { type: "json" },
      })
    ).default as {
      kind: string
      apiVersion: number
      name: string
      entry: string
    }
    expect(manifestJson.kind).toBe("addon")
    expect(manifestJson.apiVersion).toBe(1)
    expect(manifestJson.name).toBe("core")
    expect(manifestJson.entry).toBe("index.ts")
  })
})