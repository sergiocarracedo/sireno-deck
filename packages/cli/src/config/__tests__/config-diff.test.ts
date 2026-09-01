import { describe, expect, it } from "vitest"

import type { RawConfig } from "@/config/schemas"
import { decksChanged } from "@/config/config-diff"

const baseConfig = (overrides: Partial<RawConfig> = {}): RawConfig => ({
  theme: undefined,
  logging: undefined,
  decks: {
    main: {
      buttons: [
        { type: "core:action", config: { command: "x" } },
        { type: "core:change-deck", config: { deck: "media" } },
      ],
    },
  },
  addons: undefined,
  lock: undefined,
  ...overrides,
})

describe("decksChanged", () => {
  it("returns false when decks are identical", () => {
    const prev = baseConfig()
    const next = baseConfig()
    expect(decksChanged(prev, next)).toBe(false)
  })

  it("returns true when a deck id is added", () => {
    const prev = baseConfig()
    const next = baseConfig({
      decks: {
        ...prev.decks,
        media: { buttons: [{ type: "core:action", config: {} }] },
      },
    })
    expect(decksChanged(prev, next)).toBe(true)
  })

  it("returns true when a deck id is removed", () => {
    const prev = baseConfig()
    const next = baseConfig({ decks: {} })
    expect(decksChanged(prev, next)).toBe(true)
  })

  it("returns true when a button is added", () => {
    const prev = baseConfig()
    const next = baseConfig({
      decks: {
        main: {
          buttons: [
            ...prev.decks["main"]!.buttons,
            { type: "core:action", config: {} },
          ],
        },
      },
    })
    expect(decksChanged(prev, next)).toBe(true)
  })

  it("returns true when a button config changes", () => {
    const prev = baseConfig()
    const next = baseConfig({
      decks: {
        main: {
          buttons: [
            { type: "core:action", config: { command: "y" } },
            prev.decks.main!.buttons[1]!,
          ],
        },
      },
    })
    expect(decksChanged(prev, next)).toBe(true)
  })

  it("returns true when a button position changes", () => {
    const prev = baseConfig({
      decks: {
        main: {
          buttons: [
            { type: "core:action", config: {}, position: 0 },
            { type: "core:action", config: {}, position: 1 },
          ],
        },
      },
    })
    const next = baseConfig({
      decks: {
        main: {
          buttons: [
            { type: "core:action", config: {}, position: 1 },
            { type: "core:action", config: {}, position: 0 },
          ],
        },
      },
    })
    expect(decksChanged(prev, next)).toBe(true)
  })

  it("returns false when only theme/addons/logging changed", () => {
    const prev = baseConfig()
    const next = baseConfig({ theme: "dark", addons: ["a"] })
    expect(decksChanged(prev, next)).toBe(false)
  })
})
