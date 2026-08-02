import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { dirname, resolve as resolvePath, join } from "node:path"
import { cpSync, existsSync, readFileSync, readdirSync } from "node:fs"

import type { AddonRegistry } from "@/addon/registry"
import type { LoadedTheme } from "@/addon/api"
import { ThemeJsonManifestSchema, type ThemeJsonManifest } from "./manifest"
import { buildThemeCss } from "./css"
import type { ThemeEntry } from "@/config/schemas"

const here = dirname(fileURLToPath(import.meta.url))
const themesRoot = here
// ponytail: sibling scan — first-party themes shipped outside the CLI package
// (e.g. packages/themes/<name>) get registered as "sibling" so authors can
// iterate on a theme in a separate workspace. `here` is
// `<repo>/packages/cli/src/themes`, so `../../../themes` lands in
// `<repo>/packages/themes`.
const siblingThemesRoot = resolvePath(here, "..", "..", "..", "themes")

export interface BuiltInThemeSpec {
  name: string
  dir: string
}

function _discoverThemesInRoot(
  root: string,
): ReadonlyArray<{ dir: string; name: string }> {
  if (!existsSync(root)) return []
  const entries = readdirSync(root, { withFileTypes: true })
  const themes: { dir: string; name: string }[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const manifestPath = join(root, entry.name, "sirenodeck.json")
    if (!existsSync(manifestPath)) continue
    themes.push({ dir: join(root, entry.name), name: entry.name })
  }
  return themes
}

function _discoverThemesDir(): ReadonlyArray<{ dir: string; name: string }> {
  return _discoverThemesInRoot(themesRoot)
}

function _discoverSiblingThemesDir(): ReadonlyArray<{
  dir: string
  name: string
}> {
  return _discoverThemesInRoot(siblingThemesRoot)
}

export const BUILT_IN_THEMES: ReadonlyArray<BuiltInThemeSpec> =
  _discoverThemesDir().map(({ dir, name }) => ({ name, dir }))

function discoverThemeManifests(): ReadonlyArray<{
  dir: string
  name: string
}> {
  return _discoverThemesDir()
}

export function readAndValidateManifest(
  manifestPath: string,
  expectedName?: string,
): ThemeJsonManifest {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf8"))
  } catch {
    throw new Error(`Failed to parse theme manifest: ${manifestPath}`)
  }
  const result = ThemeJsonManifestSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(
      `Invalid theme manifest in ${manifestPath}: ${result.error.message}`,
    )
  }
  if (expectedName !== undefined && result.data.name !== expectedName) {
    throw new Error(
      `Theme name '${result.data.name}' in ${manifestPath} does not match expected '${expectedName}'`,
    )
  }
  return result.data
}

export function buildThemeCssFromManifest(
  manifest: ThemeJsonManifest,
  themeDir: string,
): string {
  const assetsStyles = (manifest.assets?.styles ?? ["./components.css"]).map(
    (s) => resolvePath(themeDir, s),
  )
  const stylesheetContents = assetsStyles.map((p) => {
    try {
      return readFileSync(p, "utf8")
    } catch {
      return `/* stylesheet not found: ${p} */`
    }
  })
  return buildThemeCss(manifest, stylesheetContents)
}

// ponytail: theme.css is emitted into the vite frontend's `.sireno-deck/`
// dir, but its `url('./assets/...')` font/asset paths are relative to THAT
// file — so the theme's assets/ must be copied next to it or every font 404s.
export function copyThemeAssets(themeDir: string, cssDir: string): void {
  const assetsDir = join(themeDir, "assets")
  if (!existsSync(assetsDir)) return
  cpSync(assetsDir, join(cssDir, "assets"), { recursive: true })
}

function buildLoadedTheme(
  manifest: ThemeJsonManifest,
  themeDir: string,
  source:
    | { kind: "builtin"; resolvedPath: string }
    | { kind: "sibling"; resolvedPath: string }
    | { kind: "local"; resolvedPath: string },
): { theme: LoadedTheme; getCss: () => string } {
  const uiOverridesPath = manifest["ui-overrides"]
    ? resolvePath(themeDir, manifest["ui-overrides"])
    : null

  const theme: LoadedTheme = {
    name: manifest.name,
    apiVersion: manifest.apiVersion,
    source,
    manifestPath: join(themeDir, "sirenodeck.json"),
    uiOverridesPath,
    cssPath: "",
  }

  const getCss = (): string => buildThemeCssFromManifest(manifest, themeDir)

  return { theme, getCss }
}

export function loadBuiltInThemes(): Array<{
  theme: LoadedTheme
  getCss: () => string
}> {
  const discovered = discoverThemeManifests()
  return discovered.map(({ dir, name }) => {
    const manifest = readAndValidateManifest(join(dir, "sirenodeck.json"), name)
    return buildLoadedTheme(manifest, dir, {
      kind: "builtin",
      resolvedPath: dir,
    })
  })
}

export const registerBuiltInThemes = (registry: AddonRegistry): void => {
  const builtIns = loadBuiltInThemes()
  for (const { theme } of builtIns) {
    registry.loadTheme(theme)
  }
}

export function loadSiblingThemes(): Array<{
  theme: LoadedTheme
  getCss: () => string
}> {
  const discovered = _discoverSiblingThemesDir()
  return discovered.map(({ dir, name }) => {
    const manifest = readAndValidateManifest(join(dir, "sirenodeck.json"), name)
    return buildLoadedTheme(manifest, dir, {
      kind: "sibling",
      resolvedPath: dir,
    })
  })
}

export const registerSiblingThemes = (registry: AddonRegistry): void => {
  const siblings = loadSiblingThemes()
  for (const { theme } of siblings) {
    registry.loadTheme(theme)
  }
}

export function loadThemeFromPath(
  registry: AddonRegistry,
  themePath: string,
  aliasName?: string,
): { theme: LoadedTheme; getCss: () => string } {
  const resolvedPath = resolvePath(themePath)
  const manifestPath = join(resolvedPath, "sirenodeck.json")
  const manifest = readAndValidateManifest(manifestPath)
  const { theme, getCss } = buildLoadedTheme(manifest, resolvedPath, {
    kind: "local",
    resolvedPath,
  })
  // ponytail: theme may already be registered by `registerSiblingThemes`
  // (sibling scan at boot) or a previous load. Skip the duplicate-registration
  // throw — the manifest-driven getCss callback is still produced either way.
  if (registry.getTheme(theme.name) === undefined) {
    registry.loadTheme(theme)
  }
  if (aliasName !== undefined && aliasName !== manifest.name) {
    if (registry.getTheme(aliasName) === undefined) {
      registry.loadTheme({ ...theme, name: aliasName })
    }
  }
  return { theme, getCss }
}

export type ResolveThemeOptions = {
  theme: ThemeEntry | undefined
}

export interface ResolveThemeResult {
  theme: LoadedTheme
  getCss: () => string
}

/**
 * Detect whether a string looks like a filesystem path. Strict prefix
 * detection — only `./`, `../`, `/`, or a Windows drive letter. Anything
 * else is treated as a registered theme name or an npm package.
 */
function isPathLike(s: string): boolean {
  return (
    s.startsWith("./") ||
    s.startsWith("../") ||
    s.startsWith("/") ||
    /^[a-zA-Z]:[\\/]/.test(s)
  )
}

/**
 * Resolve an npm package name to its installed directory via Node's
 * resolver. Returns null when the package isn't found.
 */
function resolvePackagePath(name: string): string | null {
  try {
    const require = createRequire(import.meta.url)
    const pkgJsonPath = require.resolve(`${name}/package.json`)
    return dirname(pkgJsonPath)
  } catch {
    return null
  }
}

const resolveBuiltinTheme = (
  registry: AddonRegistry,
  theme: LoadedTheme,
): ResolveThemeResult => {
  if (theme.source.kind === "builtin" || theme.source.kind === "sibling") {
    const themeDir = dirname(theme.manifestPath)
    const manifest = readAndValidateManifest(theme.manifestPath, theme.name)
    return {
      theme,
      getCss: () => buildThemeCssFromManifest(manifest, themeDir),
    }
  }
  return { theme, getCss: () => "" }
}

const resolveStringTheme = (
  entry: string,
  registry: AddonRegistry,
): ResolveThemeResult => {
  // 1. Registered theme name (built-in auto-discovery or a previously
  //    loaded theme). Use getTheme (returns undefined when missing);
  //    resolveActiveTheme throws, which short-circuits the dispatcher.
  const registered = registry.getTheme(entry)
  if (registered) {
    return resolveBuiltinTheme(registry, registered)
  }

  // 2. Path — `./`, `../`, `/`, or a Windows drive letter.
  if (isPathLike(entry)) {
    return loadThemeFromPath(registry, entry)
  }

  // 3. npm package — resolve to the installed package directory and load
  //    the theme files inside it.
  const packagePath = resolvePackagePath(entry)
  if (packagePath !== null) {
    return loadThemeFromPath(registry, packagePath)
  }

  throw new Error(
    `Theme '${entry}' is not a registered theme, not a path, and not a known npm package.`,
  )
}

export const resolveActiveTheme = (
  registry: AddonRegistry,
  options: ResolveThemeOptions,
): ResolveThemeResult => {
  const { theme: themeEntry } = options
  if (themeEntry === undefined) {
    const theme = registry.resolveActiveTheme(undefined)
    return resolveBuiltinTheme(registry, theme)
  }
  return resolveStringTheme(themeEntry, registry)
}
