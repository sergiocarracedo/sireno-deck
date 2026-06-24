import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

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
  normalizeAddonEntry,
  resolveLocalAddonRoot,
} from "./spec.ts";
import type { RawAddonEntry } from "@/config/schemas.ts";

export interface LoadAddonsOptions {
  entries: RawAddonEntry[];
  configDir: string;
  homeDir: string;
  currentApiVersion: number;
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
): { module: SirenoAddon } | { error: string } => {
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
  if (candidate.apiVersion !== expectedApi) {
    return {
      error: `Addon apiVersion mismatch in ${source}: expected ${expectedApi}, got ${candidate.apiVersion}`,
    };
  }
  if (candidate.buttons === undefined && candidate.decks === undefined) {
    return { error: `Addon ${source} defines no buttons or decks` };
  }
  return { module: candidate };
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
  return {
    manifest,
    module: validated.module,
    source: { kind: "local", specifier: source, resolvedPath: root },
  };
};

export const loadAddons = async ({
  entries,
  configDir,
  homeDir,
  currentApiVersion,
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
    recordIssue(issues, {
      level: "error",
      source: entry.source,
      message: "npm addon loading is not yet implemented (planned for later phase)",
    });
  }
  return { addons, themes, issues };
};
