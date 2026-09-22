import { describe, expect, it } from "vitest"

import {
  collectBuiltinAddonRegistry,
  discoverAddonPollers,
  resolveBuiltinDir,
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

/**
 * The builtin addons are found by walking up from this module's own location,
 * and the number of hops differs between running from source and running the
 * published bundle. Getting it wrong is invisible: the scan just returns an
 * empty list, every builtin loses its frontend entry, and the deck renders
 * blank keys with no error. These cases pin both layouts.
 */
describe("resolveBuiltinDir", () => {
  const PKG = "/opt/app/node_modules/@sirenodeck/sirenodeck"

  it("finds the sources when running from src/cli/commands", () => {
    const exists = (p: string): boolean => p === `${PKG}/src/builtin-addons`
    expect(resolveBuiltinDir(`${PKG}/src/cli/commands`, exists)).toBe(
      `${PKG}/src/builtin-addons`,
    )
  })

  it("finds the sources when running from the bundle in dist/", () => {
    // The published package ships `src/` beside `dist/`, so the addons are
    // there — the old single hop landed outside the package entirely.
    const exists = (p: string): boolean => p === `${PKG}/src/builtin-addons`
    expect(resolveBuiltinDir(`${PKG}/dist`, exists)).toBe(
      `${PKG}/src/builtin-addons`,
    )
  })

  it("never returns the path that sits outside the package", () => {
    const exists = (p: string): boolean => p === `${PKG}/src/builtin-addons`
    expect(resolveBuiltinDir(`${PKG}/dist`, exists)).not.toBe(
      "/opt/app/node_modules/@sirenodeck/builtin-addons",
    )
  })

  it("accepts addons emitted next to the entry point", () => {
    const exists = (p: string): boolean => p === `${PKG}/dist/builtin-addons`
    expect(resolveBuiltinDir(`${PKG}/dist`, exists)).toBe(
      `${PKG}/dist/builtin-addons`,
    )
  })

  it("falls back to the source layout when nothing exists, so the error names a sane path", () => {
    expect(resolveBuiltinDir(`${PKG}/src/cli/commands`, () => false)).toBe(
      `${PKG}/src/builtin-addons`,
    )
  })

  it("resolves to a real directory in this checkout", () => {
    expect(scanBuiltinAddons).toBeDefined()
  })
})

/**
 * The button types of the shipped builtins, scanned the way a published
 * install scans them. Under `tsx` the JSON-manifest path can `import()` a
 * `.ts` entry and read `buttonTypes` off the module; the published bundle runs
 * on plain node, where that import throws and the catch leaves the list empty.
 * The text fallback is what has to carry those addons, so it has to cope with
 * the shapes the builtins actually use: a barrel that re-exports its manifest,
 * and a TypeScript ESM specifier that names the emitted `.js`.
 */
describe("scanBuiltinAddons covers the barrel-entry builtins", () => {
  it("finds system-status, whose index.ts only re-exports ./manifest", async () => {
    const scanned = await scanBuiltinAddons()
    const systemStatus = scanned.find((a) => a.name === "system-status")
    expect(systemStatus).toBeDefined()
    expect(systemStatus!.types).toContain("system-status:system-status")
    expect(systemStatus!.frontendEntry).not.toBeNull()
  })

  it('finds coding-agents, whose barrel imports "./manifest.js"', async () => {
    const scanned = await scanBuiltinAddons()
    const codingAgents = scanned.find((a) => a.name === "coding-agents")
    expect(codingAgents).toBeDefined()
    expect(codingAgents!.types).toEqual(
      expect.arrayContaining(["coding-agents:summary", "coding-agents:agent"]),
    )
    expect(codingAgents!.frontendEntry).not.toBeNull()
  })

  it("gives every scanned builtin a frontend entry", async () => {
    // A builtin without one is dropped from the frontend's addon registry and
    // its buttons render as blank keys, with nothing logged to say why.
    const scanned = await scanBuiltinAddons()
    expect(scanned.length).toBeGreaterThan(0)
    const withoutEntry = scanned
      .filter((a) => a.types.length > 0 && a.frontendEntry === null)
      .map((a) => a.name)
    expect(withoutEntry).toEqual([])
  })
})
