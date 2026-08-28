import { describe, expect, it } from "vitest"

import {
  collectBuiltinAddonRegistry,
  discoverAddonPollers,
  scanBuiltinAddons,
  validateBuiltinButtonConfigs,
  type ScannedAddon,
} from "../addon-registry"

const scannedFixture: ReadonlyArray<ScannedAddon> = [
  {
    name: "date-time",
    types: ["date-time:time", "date-time:date"],
    frontendEntry: "/abs/date-time/frontend",
    publishIntervalMs: 1000,
    pollerEntry: null,
    buttonTypes: {},
    deckTypes: {},
    source: "regex",
    globalServiceEntry: null,
    decks: [],
  },
  {
    name: "weather",
    types: ["core:weather"],
    frontendEntry: "/abs/weather/frontend",
    publishIntervalMs: 600000,
    pollerEntry: null,
    buttonTypes: {},
    deckTypes: {},
    source: "regex",
    globalServiceEntry: null,
    decks: [],
  },
  {
    name: "no-frontend",
    types: ["core:custom"],
    frontendEntry: null,
    publishIntervalMs: 1000,
    pollerEntry: null,
    buttonTypes: {},
    deckTypes: {},
    source: "regex",
    globalServiceEntry: null,
    decks: [],
  },
]

describe("collectBuiltinAddonRegistry", () => {
  it("discovers the built-in addons", async () => {
    const registry = await collectBuiltinAddonRegistry()
    expect(registry.scanned.length).toBeGreaterThan(0)
    const names = registry.scanned.map((a) => a.name)
    expect(names).toContain("date-time")
    expect(names).toContain("weather")
  })

  it("populates byType with the type → addon map", async () => {
    const registry = await collectBuiltinAddonRegistry()
    expect(registry.byType.get("date-time:time")?.name).toBe("date-time")
    expect(registry.byType.get("weather:weather")?.name).toBe("weather")
  })
})

describe("discoverAddonPollers", () => {
  it("returns an empty array when no addons have poller entries", async () => {
    const discovered = await discoverAddonPollers({}, scannedFixture)
    expect(discovered).toEqual([])
  })

  it("filters out addons without publishIntervalMs", async () => {
    const without: ScannedAddon[] = [
      {
        name: "no-cadence",
        types: ["core:nope"],
        frontendEntry: null,
        publishIntervalMs: null,
        pollerEntry: "/some/poller",
        buttonTypes: {},
        deckTypes: {},
        source: "regex",
        globalServiceEntry: null,
        decks: [],
      },
    ]
    const discovered = await discoverAddonPollers({}, without)
    expect(discovered).toEqual([])
  })
})

describe("validateBuiltinButtonConfigs", () => {
  it("finds no issues with builtin button configs", () => {
    const issues = validateBuiltinButtonConfigs()
    expect(issues).toHaveLength(0)
  })
})

describe("JSON manifest scan path", () => {
  it("discovers builtin addons via their sirenodeck.json", async () => {
    const builtinScanned = await scanBuiltinAddons()
    const dateTime = builtinScanned.find((s) => s.name === "date-time")
    expect(dateTime?.source).toBe("json")
    expect(dateTime?.frontendEntry).toContain("date-time/index.ts")
    expect(dateTime?.types.length).toBeGreaterThan(0)
  })

  it("registers `<addon>:<addon>` types under the bare addon name", async () => {
    const registry = await collectBuiltinAddonRegistry()
    expect(registry.byType.get("date-time:date-time")?.name).toBe("date-time")
    expect(registry.byType.get("date-time")?.name).toBe("date-time")
  })

  it("discovers coding-agents with its button types and global-entry", async () => {
    const builtinScanned = await scanBuiltinAddons()
    const codingAgents = builtinScanned.find((s) => s.name === "coding-agents")
    expect(codingAgents).toBeDefined()
    expect(codingAgents?.types).toEqual(
      expect.arrayContaining(["coding-agents:summary", "coding-agents:agent"]),
    )
    expect(codingAgents?.globalServiceEntry).toContain("global-entry.ts")
  })
})
