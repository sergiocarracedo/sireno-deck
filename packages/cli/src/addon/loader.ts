import { createRequire } from "node:module"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { tsImport } from "tsx/esm/api"

import { AddonManifestError, validateAddonApiVersion, validateAddonManifest, type AddonManifest } from "./manifest"

import type { AddonRegistry } from "./registry"
import type { AddonSchema } from "@/core/schemas"
import type { SirenoAddon } from "./api"

const require = createRequire(import.meta.url)
const RAW_SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"])
const TRANSPILED_SOURCE_EXTENSIONS = new Set([".jsx", ".ts", ".tsx"])
const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const PACKAGE_TSCONFIG_PATH = resolve(MODULE_DIRECTORY, "../../tsconfig.json")
const PACKAGE_SOURCE_ENTRY_PATH = resolve(MODULE_DIRECTORY, "../index.ts")
const PACKAGE_SOURCE_ROOT = dirname(PACKAGE_SOURCE_ENTRY_PATH)
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

function resolveRawSourceImportPath(modulePath: string, specifier: string): string | undefined {
  if (isAbsolute(specifier)) {
    return specifier
  }

  if (!(specifier.startsWith("./") || specifier.startsWith("../"))) {
    return undefined
  }

  const directPath = resolve(dirname(modulePath), specifier)
  const candidatePaths = [
    directPath,
    `${directPath}.js`,
    `${directPath}.mjs`,
    `${directPath}.cjs`,
    `${directPath}.jsx`,
    `${directPath}.ts`,
    `${directPath}.tsx`,
    join(directPath, "index.js"),
    join(directPath, "index.mjs"),
    join(directPath, "index.cjs"),
    join(directPath, "index.jsx"),
    join(directPath, "index.ts"),
    join(directPath, "index.tsx"),
  ]

  return candidatePaths.find((candidatePath) => existsSync(candidatePath))
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
      const resolvedPath = resolveRawSourceImportPath(currentPath, specifier)
      if (!resolvedPath) {
        continue
      }

      if (!isWithinRoot(rootDir, resolvedPath)) {
        throw new AddonLoadError(`Addon '${manifest.name}' source imports must stay inside the addon root`, manifest.name)
      }

      pendingPaths.push(resolvedPath)
    }
  }
}

async function importRawSourceAddon(rootDir: string, entryPath: string, manifest: AddonManifest): Promise<unknown> {
  assertRawSourceModuleGraph(rootDir, entryPath, manifest)

  const rootTsconfigPath = join(rootDir, "tsconfig.json")
  const wroteTempTsconfig = !existsSync(rootTsconfigPath)

  try {
    if (wroteTempTsconfig) {
      writeFileSync(
        rootTsconfigPath,
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              types: ["node"],
              jsx: "react-jsx",
              module: "ESNext",
              moduleResolution: "bundler",
              baseUrl: rootDir,
              paths: {
                "@/*": [PACKAGE_SOURCE_ROOT + "/*"],
                "sireno-deck-cli": [PACKAGE_SOURCE_ENTRY_PATH],
              },
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
            },
            include: ["./**/*"],
          },
          undefined,
          2,
        ),
      )
    }

    const importedEntryUrl = pathToFileURL(entryPath).href

    return await tsImport(importedEntryUrl, {
      parentURL: importedEntryUrl,
      tsconfig: rootTsconfigPath,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new AddonLoadError(`Failed to import addon '${manifest.name}' raw source: ${message}`, manifest.name)
  } finally {
    if (wroteTempTsconfig) {
      rmSync(rootTsconfigPath, { force: true })
    }
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
