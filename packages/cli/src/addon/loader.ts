import { existsSync, readFileSync } from "node:fs"
import { resolve as resolvePath, join } from "node:path"
import { pathToFileURL } from "node:url"

import { execa } from "execa"

import { addonNpmInstallPath } from "@/util/cache-paths"

import type {
  AddonJsonManifest,
  AddonLoadIssue,
  AddonManifest,
  AddonManifestV1,
  LoadedTheme,
} from "./api"
import type { RawAddonEntry } from "@/config/schemas"
import {
  addonRootExists,
  isLocalAddonSpec,
  isNpmAddonSpec,
  normalizeAddonEntry,
  resolveLocalAddonRoot,
} from "./spec"

export interface LoadAddonsOptions {
  entries: RawAddonEntry[]
  configDir: string
  homeDir: string
  currentApiVersion: number
  cacheDir?: string
}

export interface ResolvedExternalAddon {
  manifest: AddonManifestV1
  source: { kind: "local" | "npm"; specifier: string; resolvedPath: string }
}

export interface LoadAddonsResult {
  addons: ResolvedExternalAddon[]
  themes: LoadedTheme[]
  issues: AddonLoadIssue[]
}

const recordIssue = (issues: AddonLoadIssue[], issue: AddonLoadIssue): void => {
  issues.push(issue)
}

const importAddonModule = async (resolvedPath: string): Promise<unknown> => {
  const url = pathToFileURL(resolvedPath).href
  return import(url)
}

const readJsonManifest = (root: string): AddonJsonManifest | null => {
  const manifestPath = join(root, "sirenodeck.json")
  if (!existsSync(manifestPath)) return null
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown
  } catch {
    return null
  }
  if (raw === null || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  if (obj["apiVersion"] !== 1) return null
  const kind = obj["kind"]
  if (kind !== "addon" && kind !== "theme") return null
  const name = obj["name"]
  const entry = obj["entry"]
  if (typeof name !== "string" || typeof entry !== "string") return null
  return { kind, apiVersion: 1, name, entry }
}

const resolveEntryPaths = (
  root: string,
  json: AddonJsonManifest,
): { ts: string; js: string } => {
  const entryExt = json.entry
  const extTs = entryExt.endsWith(".ts")
    ? join(root, entryExt)
    : join(root, `${entryExt}.ts`)
  const extJs = join(root, entryExt)
  return { ts: extTs, js: extJs }
}

const validateAndLoadEntry = async (
  source: string,
  tsPath: string,
  jsPath: string,
  issues: AddonLoadIssue[],
): Promise<AddonManifestV1 | null> => {
  const candidatePath = existsSync(tsPath) ? tsPath : jsPath
  if (!existsSync(candidatePath)) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Entry file not found: tried ${tsPath} and ${jsPath}`,
    })
    return null
  }
  let mod: unknown
  try {
    mod = await importAddonModule(candidatePath)
  } catch (err) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Failed to import addon entry: ${err instanceof Error ? err.message : String(err)}`,
    })
    return null
  }
  const exported =
    mod !== null &&
    typeof mod === "object" &&
    "default" in (mod as Record<string, unknown>) &&
    (mod as { default: unknown }).default !== undefined
      ? (mod as { default: unknown }).default
      : mod
  if (
    exported === null ||
    typeof exported !== "object" ||
    typeof (exported as Record<string, unknown>)["apiVersion"] !== "number" ||
    typeof (exported as Record<string, unknown>)["name"] !== "string"
  ) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Entry at ${candidatePath} did not export a valid AddonManifestV1 (apiVersion + name required)`,
    })
    return null
  }
  const manifest = exported as AddonManifestV1
  if (Object.keys(manifest.buttonTypes ?? {}).length === 0 && !manifest.decks) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Addon ${source} defines no buttons or decks`,
    })
    return null
  }
  return manifest
}

const loadLocalAddon = async (
  source: string,
  configDir: string,
  homeDir: string,
  issues: AddonLoadIssue[],
  currentApi: number,
): Promise<ResolvedExternalAddon | null> => {
  const root = resolveLocalAddonRoot(source, configDir, homeDir)
  if (!isLocalAddonSpec(source)) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Spec does not look like a local path: ${source}`,
    })
    return null
  }
  if (!addonRootExists(root)) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Local addon path does not exist: ${root}`,
    })
    return null
  }
  const json = readJsonManifest(root)
  if (json === null) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Missing or invalid sirenodeck.json at ${root}`,
    })
    return null
  }
  if (json.kind === "theme") {
    recordIssue(issues, {
      level: "warning",
      source,
      message: `Theme addon '${json.name}' declared via addons[] — themes must be loaded via registerBuiltInThemes()`,
    })
    return null
  }
  if (json.apiVersion !== currentApi) {
    recordIssue(issues, {
      level: "warning",
      source,
      message: `Addon apiVersion mismatch: expected ${currentApi}, got ${json.apiVersion}`,
    })
  }
  const { ts, js } = resolveEntryPaths(root, json)
  const manifest = await validateAndLoadEntry(source, ts, js, issues)
  if (!manifest) return null
  return {
    manifest,
    source: { kind: "local", specifier: source, resolvedPath: root },
  }
}

interface ParsedSpecifier {
  packageName: string
  version: string | null
}

const parseNpmSpecifier = (spec: string): ParsedSpecifier | null => {
  const atIdx = spec.lastIndexOf("@")
  if (atIdx <= 0) {
    return { packageName: spec, version: null }
  }
  const packageName = spec.slice(0, atIdx)
  const version = spec.slice(atIdx + 1)
  if (version.length === 0) return null
  return { packageName, version }
}

const readInstalledPackageJson = (
  installPath: string,
): {
  name: string
  version: string
  apiVersion: number
} | null => {
  const pkgPath = resolvePath(installPath, "package.json")
  if (!existsSync(pkgPath)) return null
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(pkgPath, "utf8")) as unknown
  } catch {
    return null
  }
  if (raw === null || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const name = typeof obj["name"] === "string" ? (obj["name"] as string) : null
  const version =
    typeof obj["version"] === "string" ? (obj["version"] as string) : null
  const apiVersion = obj["sirenoAddonApiVersion"]
  if (name === null || version === null) return null
  if (typeof apiVersion !== "number") return null
  return { name, version, apiVersion }
}

export interface InstallNpmAddonResult {
  ok: boolean
  error?: string
}

export const installNpmAddon = async (
  specifier: string,
  cacheDir: string,
  issues: AddonLoadIssue[],
): Promise<InstallNpmAddonResult> => {
  try {
    await execa(
      "npm",
      [
        "install",
        specifier,
        "--prefix",
        cacheDir,
        "--no-save",
        "--silent",
        "--no-audit",
        "--no-fund",
      ],
      { timeout: 60_000 },
    )
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    recordIssue(issues, {
      level: "error",
      source: specifier,
      message: `npm install failed: ${message}`,
    })
    return { ok: false, error: message }
  }
}

const loadNpmAddon = async (
  source: string,
  cacheDir: string,
  issues: AddonLoadIssue[],
  currentApi: number,
): Promise<ResolvedExternalAddon | null> => {
  const parsed = parseNpmSpecifier(source)
  if (parsed === null) {
    recordIssue(issues, {
      level: "error",
      source,
      message: "Invalid npm specifier",
    })
    return null
  }

  const installPath = addonNpmInstallPath(parsed.packageName, cacheDir)
  let pkg = readInstalledPackageJson(installPath)

  if (
    pkg === null ||
    (parsed.version !== null && pkg.version !== parsed.version)
  ) {
    const installResult = await installNpmAddon(source, cacheDir, issues)
    if (!installResult.ok) return null
    pkg = readInstalledPackageJson(installPath)
  }

  if (pkg === null) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Could not read package.json at ${installPath} after install`,
    })
    return null
  }

  const json = readJsonManifest(installPath)
  if (json === null) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Missing or invalid sirenodeck.json at ${installPath}`,
    })
    return null
  }
  if (json.apiVersion !== currentApi) {
    recordIssue(issues, {
      level: "warning",
      source,
      message: `Addon apiVersion mismatch: expected ${currentApi}, got ${json.apiVersion}`,
    })
  }

  const { ts, js } = resolveEntryPaths(installPath, json)
  const manifest = await validateAndLoadEntry(source, ts, js, issues)
  if (!manifest) return null
  return {
    manifest,
    source: { kind: "npm", specifier: source, resolvedPath: installPath },
  }
}

export const loadAddons = async ({
  entries,
  configDir,
  homeDir,
  currentApiVersion,
  cacheDir,
}: LoadAddonsOptions): Promise<LoadAddonsResult> => {
  const issues: AddonLoadIssue[] = []
  const addons: ResolvedExternalAddon[] = []
  const themes: LoadedTheme[] = []
  for (const rawEntry of entries) {
    const entry = normalizeAddonEntry(rawEntry)
    if (!entry.enabled) {
      recordIssue(issues, {
        level: "info",
        source: entry.source,
        message: "Addon disabled in config",
      })
      continue
    }
    if (entry.isLocal || isLocalAddonSpec(entry.source)) {
      const loaded = await loadLocalAddon(
        entry.source,
        configDir,
        homeDir,
        issues,
        currentApiVersion,
      )
      if (loaded) addons.push(loaded)
      continue
    }
    if (isNpmAddonSpec(entry.source) && cacheDir !== undefined) {
      const loaded = await loadNpmAddon(
        entry.source,
        cacheDir,
        issues,
        currentApiVersion,
      )
      if (loaded) addons.push(loaded)
      continue
    }
    recordIssue(issues, {
      level: "error",
      source: entry.source,
      message: `Unknown addon spec: '${entry.source}'. Use a local path (./my-addon) or an npm specifier (my-addon, @scope/my-addon, my-addon@1.2.3).`,
    })
  }
  return { addons, themes, issues }
}
