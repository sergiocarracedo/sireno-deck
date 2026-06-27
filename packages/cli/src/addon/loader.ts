import { existsSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

import { execa } from "execa";

import { addonNpmInstallPath } from "@/util/cache-paths.ts";

import { isSirenoAddon, type SirenoAddon } from "./api-types.ts";
import {
  type AddonLoadIssue,
  type AddonManifest,
  type LoadedTheme,
  type ResolvedSirenoAddon,
} from "./api.ts";
import { readManifest } from "./manifest.ts";
import {
  addonRootExists,
  isLocalAddonSpec,
  isNpmAddonSpec,
  normalizeAddonEntry,
  resolveLocalAddonRoot,
} from "./spec.ts";
import type { RawAddonEntry } from "@/config/schemas.ts";

export interface LoadAddonsOptions {
  entries: RawAddonEntry[];
  configDir: string;
  homeDir: string;
  currentApiVersion: number;
  cacheDir?: string;
}

export interface LoadAddonsResult {
  addons: ResolvedSirenoAddon[];
  themes: LoadedTheme[];
  issues: AddonLoadIssue[];
}

const recordIssue = (issues: AddonLoadIssue[], issue: AddonLoadIssue): void => {
  issues.push(issue);
};

const importAddonModule = async (resolvedPath: string): Promise<unknown> => {
  const url = pathToFileURL(resolvedPath).href;
  return import(url);
};

const validateModule = (
  source: string,
  moduleValue: unknown,
  expectedApi: number,
): { module: SirenoAddon; apiMismatch?: boolean } | { error: string } => {
  const candidate =
    moduleValue !== null &&
    typeof moduleValue === "object" &&
    "default" in (moduleValue as Record<string, unknown>) &&
    (moduleValue as { default: unknown }).default !== undefined
      ? (moduleValue as { default: unknown }).default
      : moduleValue;
  if (!isSirenoAddon(candidate)) {
    return {
      error: `Module at ${source} did not export a valid SirenoAddon (apiVersion + name required)`,
    };
  }
  if (candidate.buttons === undefined && candidate.decks === undefined) {
    return { error: `Addon ${source} defines no buttons or decks` };
  }
  return candidate.apiVersion !== expectedApi
    ? { module: candidate, apiMismatch: true }
    : { module: candidate };
};

const readManifestSafe = (
  root: string,
  source: string,
  issues: AddonLoadIssue[],
): AddonManifest | null => {
  try {
    return readManifest({ addonRoot: root }).manifest;
  } catch (err) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Failed to read manifest: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  }
};

const loadLocalAddon = async (
  source: string,
  configDir: string,
  homeDir: string,
  issues: AddonLoadIssue[],
  currentApi: number,
): Promise<ResolvedSirenoAddon | null> => {
  const root = resolveLocalAddonRoot(source, configDir, homeDir);
  if (!isLocalAddonSpec(source)) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Spec does not look like a local path: ${source}`,
    });
    return null;
  }
  if (!addonRootExists(root)) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Local addon path does not exist: ${root}`,
    });
    return null;
  }
  const manifest = readManifestSafe(root, source, issues);
  if (!manifest) return null;
  if (manifest.kind === "theme") {
    recordIssue(issues, {
      level: "warning",
      source,
      message: `Theme addon '${manifest.name ?? source}' declared via addons[] — themes must be loaded via registerBuiltInThemes()`,
    });
    return null;
  }
  if (manifest.apiVersion !== currentApi) {
    recordIssue(issues, {
      level: "warning",
      source,
      message: `Addon apiVersion mismatch: expected ${currentApi}, got ${manifest.apiVersion}`,
    });
  }
  const mainPath = resolvePath(root, manifest.main as string);
  let mod: unknown;
  try {
    mod = await importAddonModule(mainPath);
  } catch (err) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Failed to import addon main: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  }
  const validated = validateModule(source, mod, currentApi);
  if ("error" in validated) {
    recordIssue(issues, { level: "error", source, message: validated.error });
    return null;
  }
  if (validated.apiMismatch === true) {
    recordIssue(issues, {
      level: "warning",
      source,
      message: `Addon apiVersion mismatch: expected ${currentApi}, got ${validated.module.apiVersion}`,
    });
  }
  return {
    manifest,
    module: validated.module,
    source: { kind: "local", specifier: source, resolvedPath: root },
  };
};

interface ParsedSpecifier {
  packageName: string;
  version: string | null;
}

const parseNpmSpecifier = (spec: string): ParsedSpecifier | null => {
  const atIdx = spec.lastIndexOf("@");
  if (atIdx <= 0) {
    return { packageName: spec, version: null };
  }
  const packageName = spec.slice(0, atIdx);
  const version = spec.slice(atIdx + 1);
  if (version.length === 0) return null;
  return { packageName, version };
};

const installedPackageJson = (
  installPath: string,
): { name: string; version: string; main: string; addonManifest: AddonManifest } | null => {
  const pkgPath = resolvePath(installPath, "package.json");
  if (!existsSync(pkgPath)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(pkgPath, "utf8")) as unknown;
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj["name"] === "string" ? (obj["name"] as string) : null;
  const version = typeof obj["version"] === "string" ? (obj["version"] as string) : null;
  const main = typeof obj["main"] === "string" ? (obj["main"] as string) : "index.js";
  const apiVersion = obj["sirenoAddonApiVersion"];
  if (name === null || version === null) return null;
  if (typeof apiVersion !== "number") return null;
  return {
    name,
    version,
    main,
    addonManifest: {
      apiVersion,
      kind: "addon",
      ...(typeof obj["name"] === "string" ? { name: obj["name"] as string } : {}),
    },
  };
};

export interface InstallNpmAddonResult {
  ok: boolean;
  error?: string;
}

export const installNpmAddon = async (
  specifier: string,
  cacheDir: string,
  issues: AddonLoadIssue[],
): Promise<InstallNpmAddonResult> => {
  try {
    await execa("npm", ["install", specifier, "--prefix", cacheDir, "--no-save", "--silent", "--no-audit", "--no-fund"], {
      timeout: 60_000,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordIssue(issues, {
      level: "error",
      source: specifier,
      message: `npm install failed: ${message}`,
    });
    return { ok: false, error: message };
  }
};

const loadNpmAddon = async (
  source: string,
  cacheDir: string,
  issues: AddonLoadIssue[],
  currentApi: number,
): Promise<ResolvedSirenoAddon | null> => {
  const parsed = parseNpmSpecifier(source);
  if (parsed === null) {
    recordIssue(issues, {
      level: "error",
      source,
      message: "Invalid npm specifier",
    });
    return null;
  }

  const installPath = addonNpmInstallPath(parsed.packageName, cacheDir);
  let pkg = installedPackageJson(installPath);

  if (pkg === null || (parsed.version !== null && pkg.version !== parsed.version)) {
    const installResult = await installNpmAddon(source, cacheDir, issues);
    if (!installResult.ok) return null;
    pkg = installedPackageJson(installPath);
  }

  if (pkg === null) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Could not read package.json at ${installPath} after install`,
    });
    return null;
  }

  const mainPath = resolvePath(installPath, pkg.main);
  let mod: unknown;
  try {
    mod = await importAddonModule(mainPath);
  } catch (err) {
    recordIssue(issues, {
      level: "error",
      source,
      message: `Failed to import addon main: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  }
  const validated = validateModule(source, mod, currentApi);
  if ("error" in validated) {
    recordIssue(issues, { level: "error", source, message: validated.error });
    return null;
  }
  if (validated.apiMismatch === true) {
    recordIssue(issues, {
      level: "warning",
      source,
      message: `Addon apiVersion mismatch: expected ${currentApi}, got ${validated.module.apiVersion}`,
    });
  }

  return {
    manifest: pkg.addonManifest,
    module: validated.module,
    source: { kind: "npm", specifier: source, resolvedPath: installPath },
  };
};

export const loadAddons = async ({
  entries,
  configDir,
  homeDir,
  currentApiVersion,
  cacheDir,
}: LoadAddonsOptions): Promise<LoadAddonsResult> => {
  const issues: AddonLoadIssue[] = [];
  const addons: ResolvedSirenoAddon[] = [];
  const themes: LoadedTheme[] = [];
  for (const rawEntry of entries) {
    const entry = normalizeAddonEntry(rawEntry);
    if (!entry.enabled) {
      recordIssue(issues, {
        level: "info",
        source: entry.source,
        message: "Addon disabled in config",
      });
      continue;
    }
    if (entry.isLocal || isLocalAddonSpec(entry.source)) {
      const loaded = await loadLocalAddon(
        entry.source,
        configDir,
        homeDir,
        issues,
        currentApiVersion,
      );
      if (loaded) addons.push(loaded);
      continue;
    }
    if (isNpmAddonSpec(entry.source) && cacheDir !== undefined) {
      const loaded = await loadNpmAddon(entry.source, cacheDir, issues, currentApiVersion);
      if (loaded) addons.push(loaded);
      continue;
    }
    recordIssue(issues, {
      level: "error",
      source: entry.source,
      message: `Unknown addon spec: '${entry.source}'. Use a local path (./my-addon) or an npm specifier (my-addon, @scope/my-addon, my-addon@1.2.3).`,
    });
  }
  return { addons, themes, issues };
};
