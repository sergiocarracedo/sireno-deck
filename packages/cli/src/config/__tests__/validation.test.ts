import { describe, expect, it } from "vitest"

import { AddonRegistry } from "@/addon/registry"
import { coreAddon } from "@/builtin-addons/core/index"
import { internalSettingsAddon } from "@/builtin-addons/internal-settings/index"
import { sessionAddon } from "@/builtin-addons/session/index"

import { validateFull } from "../validation"
import type { RawConfig } from "../schemas"

const registry = (): AddonRegistry => {
  const r = new AddonRegistry()
  r.load(coreAddon)
  r.load(internalSettingsAddon)
  r.load(sessionAddon)
  return r
}

const baseConfig = (overrides: Partial<RawConfig> = {}): RawConfig => ({
  theme: "default",
  logging: { level: "info" },
  decks: {
    main: {
      name: "Main",
      buttons: [],
    },
  },
  addons: [],
  session: { locked_deck: "session:locked" },
  ...overrides,
})

describe("validateFull", () => {
  it("clean config with valid core:change-deck button passes", () => {
    const reg = registry()
    const config = baseConfig({
      decks: {
        main: {
          name: "Main",
          buttons: [
            {
              position: 0,
              type: "core:change-deck",
              config: { deck: "media", label: "Media" },
            },
          ],
        },
      },
    })
    const result = validateFull(config, reg)
    expect(result.issues).toEqual([])
  })

  it("unknown button type errors with path", () => {
    const reg = registry()
    const config = baseConfig({
      decks: {
        main: {
          name: "Main",
          buttons: [{ position: 0, type: "made:up", config: {} }],
        },
      },
    })
    const result = validateFull(config, reg)
    expect(
      result.issues.some((i) => i.message.includes("Unknown button type")),
    ).toBe(true)
  })

  it("internal: true button (internal-settings:brightness-down) used in user config errors", () => {
    const reg = registry()
    const config = baseConfig({
      decks: {
        main: {
          name: "Main",
          buttons: [
            { position: 0, type: "internal-settings:brightness-down", config: {} },
          ],
        },
      },
    })
    const result = validateFull(config, reg)
    expect(
      result.issues.some((i) => i.message.includes("Internal button")),
    ).toBe(true)
  })

  it("bad core:action config (missing icon and label) errors", () => {
    const reg = registry()
    const config = baseConfig({
      decks: {
        main: {
          name: "Main",
          buttons: [
            {
              position: 0,
              type: "core:action",
              config: {},
            },
          ],
        },
      },
    })
    const result = validateFull(config, reg)
    expect(result.issues.some((i) => /icon|label/.test(i.message))).toBe(true)
  })

  it("empty issues array returns no errors", () => {
    const reg = registry()
    const config = baseConfig()
    const result = validateFull(config, reg)
    expect(result.issues).toEqual([])
  })
})
