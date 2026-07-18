import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  AddonRegistry,
  isLocalAddonSpec,
  loadAddons,
  normalizeAddonEntry,
  resolveLocalAddonRoot,
  type AddonManifestV1,
} from "@/addon"
import { SIRENO_ADDON_API_VERSION } from "@/addon"

const tempRoots: string[] = []

const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "sireno-addon-"))
  tempRoots.push(dir)
  return dir
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe("isLocalAddonSpec", () => {
  it("detects ./ and ../", () => {
    expect(isLocalAddonSpec("./my-addon")).toBe(true)
    expect(isLocalAddonSpec("../shared/my-addon")).toBe(true)
  })

  it("detects absolute paths", () => {
    expect(isLocalAddonSpec("/abs/my-addon")).toBe(true)
  })

  it("detects home paths", () => {
    expect(isLocalAddonSpec("~/addons/x")).toBe(true)
  })

  it("detects paths with separators", () => {
    expect(isLocalAddonSpec("addons/local")).toBe(true)
    expect(isLocalAddonSpec("foo\\bar")).toBe(true)
  })

  it("treats bare names and @scoped as npm", () => {
    expect(isLocalAddonSpec("core")).toBe(false)
    expect(isLocalAddonSpec("@me/my-addon")).toBe(false)
    expect(isLocalAddonSpec("@me/my-addon@1.2.3")).toBe(false)
  })
})

describe("normalizeAddonEntry", () => {
  it("normalizes a string entry", () => {
    expect(normalizeAddonEntry("core")).toEqual({
      enabled: true,
      source: "core",
      isLocal: false,
    })
    expect(normalizeAddonEntry("./local")).toEqual({
      enabled: true,
      source: "./local",
      isLocal: true,
    })
  })

  it("normalizes an object entry with default enabled", () => {
    expect(normalizeAddonEntry({ source: "./x" })).toEqual({
      enabled: true,
      source: "./x",
      isLocal: true,
    })
    expect(normalizeAddonEntry({ source: "core", enabled: false })).toEqual({
      enabled: false,
      source: "core",
      isLocal: false,
    })
  })
})

describe("resolveLocalAddonRoot", () => {
  it("returns absolute paths unchanged", () => {
    expect(resolveLocalAddonRoot("/abs/path", "/tmp", "/home/me")).toBe(
      "/abs/path",
    )
  })

  it("resolves relative paths against configDir", () => {
    expect(resolveLocalAddonRoot("./my-addon", "/etc/sireno", "/home/me")).toBe(
      "/etc/sireno/my-addon",
    )
  })

  it("expands ~ to homeDir", () => {
    expect(resolveLocalAddonRoot("~/addons/x", "/etc/sireno", "/home/me")).toBe(
      "/home/me/addons/x",
    )
  })
})

describe("loadAddons", () => {
  it("loads a local addon via sirenodeck.json + entry", async () => {
    const configDir = makeTempDir()
    const addonDir = join(configDir, "my-addon")
    mkdirSync(addonDir, { recursive: true })
    writeFileSync(
      join(addonDir, "sirenodeck.json"),
      JSON.stringify({
        kind: "addon",
        apiVersion: 1,
        name: "my-addon",
        entry: "index.ts",
      }),
    )
    writeFileSync(
      join(addonDir, "index.ts"),
      [
        "import { z } from 'zod';",
        "const configSchema = z.object({ name: z.string() });",
        "const frontend = () => null;",
        "export default {",
        "  apiVersion: 1,",
        "  name: 'my-addon',",
        "  buttonTypes: {",
        "    'my-addon:hello': { frontend, backend: { configSchema } },",
        "  },",
        "} satisfies import('@/addon/api').AddonManifestV1;",
        "",
      ].join("\n"),
    )
    const result = await loadAddons({
      entries: ["./my-addon"],
      configDir,
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    })
    expect(result.addons).toHaveLength(1)
    expect(result.addons[0]?.manifest.name).toBe("my-addon")
    expect(
      result.addons[0]?.manifest.buttonTypes["my-addon:hello"],
    ).toBeDefined()
    expect(result.issues).toHaveLength(0)
  })

  it("records info issue when addon is disabled", async () => {
    const result = await loadAddons({
      entries: [{ source: "./anywhere", enabled: false }],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    })
    expect(result.addons).toHaveLength(0)
    expect(result.issues.some((i) => /disabled/i.test(i.message))).toBe(true)
  })

  it("records error when local addon path does not exist", async () => {
    const result = await loadAddons({
      entries: ["./does-not-exist"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    })
    expect(result.addons).toHaveLength(0)
    expect(result.issues.some((i) => /does not exist/.test(i.message))).toBe(
      true,
    )
  })

  it("records error when sirenodeck.json is missing", async () => {
    const configDir = makeTempDir()
    const addonDir = join(configDir, "broken-addon")
    mkdirSync(addonDir, { recursive: true })
    const result = await loadAddons({
      entries: ["./broken-addon"],
      configDir,
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    })
    expect(result.addons).toHaveLength(0)
    expect(result.issues.some((i) => /sirenodeck.json/.test(i.message))).toBe(
      true,
    )
  })

  it("records error for npm addons when no cacheDir is provided", async () => {
    const result = await loadAddons({
      entries: ["core"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    })
    expect(result.addons).toHaveLength(0)
    expect(
      result.issues.some((i) => /Unknown addon spec/.test(i.message)),
    ).toBe(true)
  })
})

describe("AddonRegistry", () => {
  it("indexes addons, button types, and deck types", () => {
    const registry = new AddonRegistry()
    const frontend = () => null
    const backend = { configSchema: {} }
    const deckFactory = () => ({})
    const manifest: AddonManifestV1 = {
      apiVersion: 1,
      name: "test",
      buttonTypes: { "test:a": { frontend, backend } },
      decks: { "test:test-deck": deckFactory },
    }
    registry.load(manifest)
    expect(registry.listAddons()).toHaveLength(1)
    expect(registry.hasButtonType("test:a")).toBe(true)
    expect(registry.hasDeckType("test:test-deck")).toBe(true)
    expect(registry.getAddon("test")?.name).toBe("test")
    expect(registry.getButtonType("test:a")?.addonName).toBe("test")
    expect(registry.getDeckType("test:test-deck")?.addonName).toBe("test")
  })

  it("throws on duplicate addon name", () => {
    const registry = new AddonRegistry()
    const frontend = () => null
    const manifest: AddonManifestV1 = {
      apiVersion: 1,
      name: "dup",
      buttonTypes: { "dup:a": { frontend, backend: { configSchema: {} } } },
    }
    registry.load(manifest)
    expect(() => registry.load(manifest)).toThrow(/Duplicate addon name: dup/)
  })

  it("allows button types with same suffix from different addons", () => {
    const registry = new AddonRegistry()
    const frontend = () => null
    const backend = { configSchema: {} }
    registry.load({
      apiVersion: 1,
      name: "first",
      buttonTypes: { "first:shared": { frontend, backend } },
    })
    expect(() =>
      registry.load({
        apiVersion: 1,
        name: "second",
        buttonTypes: { "second:shared": { frontend, backend } },
      }),
    ).not.toThrow()
  })

  it("reset clears all state", () => {
    const registry = new AddonRegistry()
    const frontend = () => null
    registry.load({
      apiVersion: 1,
      name: "x",
      buttonTypes: { "x:a": { frontend, backend: { configSchema: {} } } },
    })
    expect(registry.listAddons()).toHaveLength(1)
    registry.reset()
    expect(registry.listAddons()).toHaveLength(0)
  })

  it("registers a `<addon>:<addon>` button type under the bare addon name", () => {
    const registry = new AddonRegistry()
    const frontend = () => null
    const backend = { configSchema: {} }
    registry.load({
      apiVersion: 1,
      name: "date-time",
      buttonTypes: {
        "date-time:date-time": { frontend, backend },
        "date-time:time": { frontend, backend },
      },
    })
    expect(registry.hasButtonType("date-time:date-time")).toBe(true)
    expect(registry.hasButtonType("date-time")).toBe(true)
    expect(registry.getButtonType("date-time")?.addonName).toBe("date-time")
    expect(registry.getButtonType("date-time")?.def).toBe(
      registry.getButtonType("date-time:date-time")?.def,
    )
  })
})
