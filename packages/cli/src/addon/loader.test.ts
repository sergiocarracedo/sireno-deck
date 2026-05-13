import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { AddonManifestError } from "./manifest.js"
import { createAddonRegistry } from "./registry.js"
import { loadConfiguredAddons } from "./loader.js"

function writeAddonFixture(rootDir: string, options: { apiVersion?: number; brokenImport?: boolean; missingManifest?: boolean; name: string }) {
  mkdirSync(rootDir, { recursive: true })

  if (!options.missingManifest) {
    writeFileSync(
      join(rootDir, "package.json"),
      JSON.stringify({
        name: options.name,
        sirenoAddon: {
          apiVersion: options.apiVersion ?? 1,
          main: "./index.js",
        },
      }, null, 2),
    )
  }

  writeFileSync(
    join(rootDir, "index.js"),
    options.brokenImport
      ? "throw new Error('broken import')"
      : `export default { apiVersion: 1, name: ${JSON.stringify(options.name)}, buttons: [{ type: ${JSON.stringify(options.name + "-button")}, configSchema: { safeParse(value) { return { success: true, data: value } } }, createInstance() { return { render() { return null } } } }] }`,
  )
}

describe("loadConfiguredAddons", () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const directory of tempDirs.splice(0, tempDirs.length)) {
      rmSync(directory, { force: true, recursive: true })
    }
  })

  it("loads local-folder addons through the unified loader path", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "sireno-addon-local-"))
    tempDirs.push(rootDir)
    writeAddonFixture(rootDir, { name: "local-addon" })

    const registry = createAddonRegistry()
    const result = await loadConfiguredAddons({
      addons: [{ enabled: true, name: "local-addon", path: rootDir, source: "local" }],
      registry,
    })

    expect(result.warnings).toEqual([])
    expect(result.loaded[0]?.manifest.name).toBe("local-addon")
    expect(registry.getButton("local-addon-button")?.type).toBe("local-addon-button")
  })

  it("loads npm-style addons through the same loader path", async () => {
    const packageRoot = mkdtempSync(join(tmpdir(), "sireno-addon-npm-"))
    tempDirs.push(packageRoot)
    writeAddonFixture(packageRoot, { name: "npm-addon" })

    const registry = createAddonRegistry()
    const result = await loadConfiguredAddons({
      addons: [{ enabled: true, name: "npm-addon", source: "npm" }],
      registry,
      resolveBareSpecifier: () => join(packageRoot, "index.js"),
    })

    expect(result.warnings).toEqual([])
    expect(result.loaded[0]?.manifest.name).toBe("npm-addon")
    expect(registry.getButton("npm-addon-button")?.type).toBe("npm-addon-button")
  })

  it("returns warnings for broken manifests and broken imports", async () => {
    const missingManifestRoot = mkdtempSync(join(tmpdir(), "sireno-addon-missing-"))
    const brokenImportRoot = mkdtempSync(join(tmpdir(), "sireno-addon-broken-"))
    tempDirs.push(missingManifestRoot, brokenImportRoot)

    writeAddonFixture(missingManifestRoot, { missingManifest: true, name: "missing-addon" })
    writeAddonFixture(brokenImportRoot, { brokenImport: true, name: "broken-addon" })

    const registry = createAddonRegistry()
    const result = await loadConfiguredAddons({
      addons: [
        { enabled: true, name: "missing-addon", path: missingManifestRoot, source: "local" },
        { enabled: true, name: "broken-addon", path: brokenImportRoot, source: "local" },
      ],
      registry,
    })

    expect(result.loaded).toEqual([])
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings.map((warning) => warning.addonName)).toEqual([
      "missing-addon",
      "broken-addon",
    ])
    expect(result.warnings[0]?.reason).toContain("missing package.json")
    expect(result.warnings[1]?.reason).toContain("broken import")
  })

  it("rejects apiVersion mismatches explicitly", async () => {
    const badVersionRoot = mkdtempSync(join(tmpdir(), "sireno-addon-version-"))
    tempDirs.push(badVersionRoot)
    writeAddonFixture(badVersionRoot, { apiVersion: 99, name: "version-addon" })

    const registry = createAddonRegistry()

    await expect(
      loadConfiguredAddons({
        addons: [{ enabled: true, name: "version-addon", path: badVersionRoot, source: "local" }],
        registry,
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<AddonManifestError>>({
      code: "api_version_mismatch",
      message: expect.stringContaining("apiVersion 99"),
      name: "AddonManifestError",
    }))
  })
})
