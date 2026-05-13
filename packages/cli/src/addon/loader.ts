import { createRequire } from "node:module"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { AddonManifestError, validateAddonApiVersion, validateAddonManifest, type AddonManifest } from "./manifest.js"

import type { AddonRegistry } from "./registry.js"
import type { AddonSchema } from "../core/schemas.js"
import type { SirenoAddon } from "./api.js"

const require = createRequire(import.meta.url)

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

async function importAddon(rootDir: string, manifest: AddonManifest): Promise<SirenoAddon> {
  const entryUrl = pathToFileURL(resolve(rootDir, manifest.main)).href
  const importedModule = await import(entryUrl)
  const addon = importedModule.default as SirenoAddon | undefined

  if (!addon || typeof addon !== "object" || !Array.isArray(addon.buttons)) {
    throw new AddonLoadError(`Addon '${manifest.name}' did not export a valid default addon definition`, manifest.name)
  }

  return addon
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
      const loadedAddon = await importAddon(rootDir, manifest)
      options.registry.registerAddon(loadedAddon)
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
