import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { addonNpmInstallPath } from "@/util/cache-paths"
import { SIRENO_ADDON_API_VERSION } from "@/addon/api-types"

vi.mock("execa", () => ({
  execa: vi.fn(),
}))

import { execa } from "execa"

const silentLogger = () => ({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  trace: () => undefined,
  fatal: () => undefined,
  child: () => silentLogger(),
  level: "silent" as const,
})

const TEST_CACHE = join(tmpdir(), `sirenodeck-loader-test-${process.pid}`)

const writeFakePackage = (
  packageName: string,
  apiVersion: number,
  _exportsDefault: boolean,
): void => {
  const installPath = addonNpmInstallPath(packageName, TEST_CACHE)
  mkdirSync(installPath, { recursive: true })
  writeFileSync(
    join(installPath, "package.json"),
    JSON.stringify({
      name: packageName,
      version: "1.0.0",
      main: "index.js",
      sirenoAddonApiVersion: apiVersion,
    }),
    "utf8",
  )
  writeFileSync(
    join(installPath, "sirenodeck.json"),
    JSON.stringify({
      kind: "addon",
      apiVersion,
      name: packageName,
      entry: "./index.js",
    }),
    "utf8",
  )
  writeFileSync(
    join(installPath, "index.js"),
    `module.exports = { apiVersion: ${apiVersion}, name: "${packageName}", buttonTypes: { "test:fake": {} }, decks: {} };`,
    "utf8",
  )
}

// ponytail: chrome-overlay and similar local addons wrap their manifest under
// a `.manifest` key (and Node's CJS-to-ESM interop may also wrap as `.default`).
// The loader must unwrap both so the manifest lands at the top level.
const writeWrapperAddon = (
  addonName: string,
  wrapperKey: "manifest" | "default",
): void => {
  const installPath = addonNpmInstallPath(addonName, TEST_CACHE)
  mkdirSync(installPath, { recursive: true })
  writeFileSync(
    join(installPath, "package.json"),
    JSON.stringify({
      name: addonName,
      version: "1.0.0",
      main: "index.js",
      sirenoAddonApiVersion: 1,
    }),
    "utf8",
  )
  writeFileSync(
    join(installPath, "sirenodeck.json"),
    JSON.stringify({
      kind: "addon",
      apiVersion: 1,
      name: addonName,
      entry: "./index.js",
    }),
    "utf8",
  )
  const inner = `module.exports = { ${wrapperKey}: { apiVersion: 1, name: "${addonName}", buttonTypes: { "test:fake": {} }, decks: {} } };`
  writeFileSync(join(installPath, "index.js"), inner, "utf8")
}

beforeEach(() => {
  if (existsSync(TEST_CACHE))
    rmSync(TEST_CACHE, { recursive: true, force: true })
  mkdirSync(TEST_CACHE, { recursive: true })
  process.env["XDG_CACHE_HOME"] = TEST_CACHE
  delete process.env["LOCALAPPDATA"]
  vi.clearAllMocks()
})

afterEach(() => {
  delete process.env["XDG_CACHE_HOME"]
  delete process.env["LOCALAPPDATA"]
  if (existsSync(TEST_CACHE))
    rmSync(TEST_CACHE, { recursive: true, force: true })
})

const loader = async () => (await import("../loader")).loadAddons

describe("loadAddons — npm path", () => {
  it("loads a cached npm addon without calling npm install", async () => {
    writeFakePackage("cached-addon", SIRENO_ADDON_API_VERSION, false)
    const loadAddons = await loader()
    const result = await loadAddons({
      entries: ["cached-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    })
    expect(result.addons).toHaveLength(1)
    expect(result.addons[0]?.source.kind).toBe("npm")
    expect(vi.mocked(execa)).not.toHaveBeenCalled()
  })

  it("reports an npm addon that is not installed", async () => {
    const loadAddons = await loader()
    const result = await loadAddons({
      entries: ["uncached-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    })

    expect(
      result.issues.some((issue) => /not installed/.test(issue.message)),
    ).toBe(true)
    expect(vi.mocked(execa)).not.toHaveBeenCalled()
  })

  it("records an error and continues when an npm addon is unavailable", async () => {
    const loadAddons = await loader()
    const result = await loadAddons({
      entries: ["broken-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    })
    expect(result.addons).toHaveLength(0)
    expect(result.issues.some((i) => /not installed/.test(i.message))).toBe(
      true,
    )
  })

  it("records error for npm specifier when cacheDir is missing", async () => {
    const loadAddons = await loader()
    const result = await loadAddons({
      entries: ["some-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    })
    expect(result.addons).toHaveLength(0)
    expect(
      result.issues.some((i) => /Unknown addon spec/.test(i.message)),
    ).toBe(true)
  })

  it("warns on apiVersion mismatch but still loads", async () => {
    writeFakePackage("future-addon", SIRENO_ADDON_API_VERSION, false)
    const loadAddons = await loader()
    const result = await loadAddons({
      entries: ["future-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    })
    expect(result.addons).toHaveLength(1)
    expect(
      result.issues.some((i) => /apiVersion mismatch/.test(i.message)),
    ).toBe(false)
  })
})

describe("loadAddons — export wrappers", () => {
  it("unwraps a manifest wrapped under the .manifest key (chrome-overlay pattern)", async () => {
    writeWrapperAddon("wrapped-manifest", "manifest")
    const loadAddons = await loader()
    const result = await loadAddons({
      entries: ["wrapped-manifest"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    })
    expect(result.issues).toEqual([])
    expect(result.addons).toHaveLength(1)
    expect(result.addons[0]?.manifest.name).toBe("wrapped-manifest")
  })

  it("unwraps a manifest wrapped under the .default key (CJS interop pattern)", async () => {
    writeWrapperAddon("wrapped-default", "default")
    const loadAddons = await loader()
    const result = await loadAddons({
      entries: ["wrapped-default"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    })
    expect(result.issues).toEqual([])
    expect(result.addons).toHaveLength(1)
    expect(result.addons[0]?.manifest.name).toBe("wrapped-default")
  })
})

void silentLogger
