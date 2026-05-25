import { createRequire } from "node:module"
import { existsSync, readFileSync } from "node:fs"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"
import { tsImport } from "tsx/esm/api"

import { AddonManifestError, validateAddonApiVersion, validateAddonManifest, type AddonManifest } from "./manifest.js"

import type { AddonRegistry } from "./registry.js"
import type { AddonSchema } from "../core/schemas.js"
import type { SirenoAddon } from "./api.js"

const require = createRequire(import.meta.url)
const RAW_SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"])
const TRANSPILED_SOURCE_EXTENSIONS = new Set([".jsx", ".ts", ".tsx"])
const RAW_SOURCE_IMPORT_PATTERN = /(?:import|export)\s+(?:[^"'`]+?\s+from\s+)?["'`]([^"'`]+)["'`]|import\(\s*["'`]([^"'`]+)["'`]\s*\)/g

export interface LoadedAddon {
  addon: SirenoAddon
  manifest: AddonManifest
  rootDir: string
}

export interface AddonLoadWarning {
  addonName: string
  reason: string
}

export interface LoadConfiguredAddonsOptions {
  addons: readonly AddonSchema[]
  cwd?: string
  registry: AddonRegistry
  resolveBareSpecifier?: (specifier: string) => string
}

export interface LoadConfiguredAddonsResult {
  loaded: LoadedAddon[]
  warnings: AddonLoadWarning[]
}

export class AddonLoadError extends Error {
  constructor(
    message: string,
    public readonly addonName: string,
  ) {
    super(message)
    this.name = "AddonLoadError"
  }
}

function getAddonRootPath(
  addon: AddonSchema,
  cwd: string,
  resolveBareSpecifier?: (specifier: string) => string,
): string {
  if (addon.source === "local") {
    return resolve(cwd, addon.path ?? join("addons", addon.name))
  }

  const entryPath = resolveBareSpecifier?.(addon.name) ?? require.resolve(addon.name)
  let currentDirectory = dirname(entryPath)

  while (currentDirectory !== dirname(currentDirectory)) {
    if (existsSync(join(currentDirectory, "package.json"))) {
      return currentDirectory
    }

    currentDirectory = dirname(currentDirectory)
  }

  throw new AddonLoadError(`Could not find package.json for addon '${addon.name}'`, addon.name)
}

function readAddonManifest(rootDir: string, addonName: string): AddonManifest {
  const manifestPath = join(rootDir, "package.json")
  if (!existsSync(manifestPath)) {
    throw new AddonLoadError(`Addon '${addonName}' is missing package.json`, addonName)
  }

  const manifest = validateAddonManifest(JSON.parse(readFileSync(manifestPath, "utf-8")))
  validateAddonApiVersion(manifest)
  return manifest
}

async function importAddon(rootDir: string, manifest: AddonManifest, source: AddonSchema["source"]): Promise<SirenoAddon> {
  const entryPath = resolve(rootDir, manifest.main)
  if (!existsSync(entryPath)) {
    throw new AddonLoadError(`Addon '${manifest.name}' runtime entry '${manifest.main}' was not found`, manifest.name)
  }

  const importedModule = source === "local" && TRANSPILED_SOURCE_EXTENSIONS.has(extname(entryPath))
    ? await importRawSourceAddon(rootDir, entryPath, manifest)
    : await import(pathToFileURL(entryPath).href)
  const addon = importedModule.default as SirenoAddon | undefined

  if (!addon || typeof addon !== "object" || !Array.isArray(addon.buttons)) {
    throw new AddonLoadError(`Addon '${manifest.name}' did not export a valid default addon definition`, manifest.name)
  }

  return addon
}

function getRawSourceImportSpecifiers(moduleSource: string): string[] {
  const specifiers = new Set<string>()

  for (const match of moduleSource.matchAll(RAW_SOURCE_IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2]
    if (specifier) {
      specifiers.add(specifier)
    }
  }

  return [...specifiers]
}

function isWithinRoot(rootDir: string, candidatePath: string): boolean {
  const relativePath = relative(rootDir, candidatePath)

  return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.includes(`${sep}..${sep}`) && relativePath !== "..")
}

function assertRawSourceModuleGraph(rootDir: string, entryPath: string, manifest: AddonManifest): void {
  const pendingPaths = [entryPath]
  const visited = new Set<string>()

  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.pop()
    if (!currentPath || visited.has(currentPath)) {
      continue
    }

    visited.add(currentPath)
    if (!existsSync(currentPath)) {
      throw new AddonLoadError(`Addon '${manifest.name}' source module '${relative(rootDir, currentPath) || currentPath}' was not found`, manifest.name)
    }

    if (!isWithinRoot(rootDir, currentPath)) {
      throw new AddonLoadError(`Addon '${manifest.name}' source imports must stay inside the addon root`, manifest.name)
    }

    if (!RAW_SOURCE_EXTENSIONS.has(extname(currentPath))) {
      continue
    }

    const source = readFileSync(currentPath, "utf-8")
    for (const specifier of getRawSourceImportSpecifiers(source)) {
      if (!(specifier.startsWith("./") || specifier.startsWith("../"))) {
        continue
      }

      const resolvedPath = require.resolve(specifier, { paths: [dirname(currentPath)] })
      if (!isWithinRoot(rootDir, resolvedPath)) {
        throw new AddonLoadError(`Addon '${manifest.name}' source imports must stay inside the addon root`, manifest.name)
      }

      pendingPaths.push(resolvedPath)
    }
  }
}

async function importRawSourceAddon(rootDir: string, entryPath: string, manifest: AddonManifest): Promise<unknown> {
  assertRawSourceModuleGraph(rootDir, entryPath, manifest)

  try {
    return await tsImport(pathToFileURL(entryPath).href, {
      parentURL: pathToFileURL(entryPath).href,
      tsconfig: false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new AddonLoadError(`Failed to import addon '${manifest.name}' raw source: ${message}`, manifest.name)
  }
}

export async function loadConfiguredAddons(options: LoadConfiguredAddonsOptions): Promise<LoadConfiguredAddonsResult> {
  const cwd = options.cwd ?? process.cwd()
  const warnings: AddonLoadWarning[] = []
  const loaded: LoadedAddon[] = []

  for (const addon of options.addons) {
    if (!addon.enabled) {
      continue
    }

    try {
      const rootDir = getAddonRootPath(addon, cwd, options.resolveBareSpecifier)
      const manifest = readAddonManifest(rootDir, addon.name)
      const loadedAddon = await importAddon(rootDir, manifest, addon.source)
      options.registry.registerAddon(loadedAddon, { rootDir })
      loaded.push({ addon: loadedAddon, manifest, rootDir })
    } catch (error) {
      if (error instanceof AddonManifestError && error.code === "api_version_mismatch") {
        throw error
      }

      warnings.push({
        addonName: addon.name,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { loaded, warnings }
}
