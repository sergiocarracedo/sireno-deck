import { describe, expect, it } from "vitest"

import { AddonRegistry } from "@/addon/registry"
import { coreAddon } from "@/builtin-addons/core/index"
import dateTimeAddon from "@/builtin-addons/date-time/index"
import { internalSettingsAddon } from "@/builtin-addons/internal-settings/index"
import { sessionAddon } from "@/builtin-addons/session/index"

import { validateFull, validatePerDeck } from "../validation"
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

  it("accepts the bare addon name as alias for `<addon>:<addon>`", () => {
    const r = new AddonRegistry()
    r.load(coreAddon)
    r.load(dateTimeAddon)
    const config: RawConfig = {
      theme: "default",
      logging: { level: "info" },
      decks: {
        main: {
          name: "Main",
          buttons: [{ position: 0, type: "date-time", config: {} }],
        },
      },
      addons: [],
    }
    const result = validateFull(config, r)
    expect(result.issues).toEqual([])
  })
})

describe("validatePerDeck", () => {
  it("captures every zod issue, not just the first, when a button config is invalid", () => {
    const reg = new AddonRegistry()
    reg.load(coreAddon)
    const config: RawConfig = {
      theme: "default",
      logging: { level: "info" },
      decks: {
        main: {
          name: "Main",
          buttons: [
            {
              position: 0,
              type: "core:change-deck",
              config: {}, // missing required `deck`
            },
          ],
        },
      },
      addons: [],
    }
    const result = validatePerDeck(config, reg)
    expect(result.perButton).toHaveLength(1)
    const btn = result.perButton[0]!
    expect(btn.issues.length).toBeGreaterThan(0)
    expect(btn.schemaIssues.length).toBeGreaterThan(0)
    expect(btn.position).toBe(0)
    expect(btn.buttonId).toBe("0")
  })

  it("captures multiple issues for one button when zod reports several", () => {
    const reg = new AddonRegistry()
    reg.load(coreAddon)
    const config: RawConfig = {
      theme: "default",
      logging: { level: "info" },
      decks: {
        main: {
          name: "Main",
          buttons: [
            {
              position: 2,
              type: "core:change-deck",
              config: { deck: 123, label: 999 }, // both wrong types
            },
          ],
        },
      },
      addons: [],
    }
    const result = validatePerDeck(config, reg)
    const btn = result.perButton[0]!
    expect(btn.schemaIssues.length).toBeGreaterThanOrEqual(2)
  })
})
