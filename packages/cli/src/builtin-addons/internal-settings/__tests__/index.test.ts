import { describe, expect, it } from "vitest"

import manifestJson from "../sirenodeck.json" with { type: "json" }

import settingsDeck from "../decks/settings"
import { manifest } from "../index"

describe("internal-settings sirenodeck.json", () => {
  it("declares kind=addon, apiVersion 1, and the expected name", () => {
    expect(manifestJson.kind).toBe("addon")
    expect(manifestJson.apiVersion).toBe(1)
    expect(manifestJson.name).toBe("internal-settings")
  })

  it("points at the entry file", () => {
    expect(manifestJson.entry).toBe("index.ts")
  })
})

describe("internal-settings settings deck", () => {
  it("uses the standard button frame for app info", () => {
    expect(
      manifest.buttonTypes["internal-settings:app-info"]?.service?.full,
    ).not.toBe(true)
  })
  it("returns the three buttons in order", () => {
    const deck = settingsDeck(0)
    expect(deck.name).toBe("Settings")
    const types = (deck.buttons ?? []).map((b) => (b as { type: string }).type)
    expect(types).toEqual([
      "internal-settings:brightness-down",
      "internal-settings:brightness-up",
      "internal-settings:app-info",
    ])
  })
})
