import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath, join } from "node:path";
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";

import type { AddonRegistry } from "@/addon/registry";
import type { LoadedTheme } from "@/addon/api";
import {
  ThemeJsonManifestSchema,
  type ThemeJsonManifest,
} from "./manifest";
import { buildThemeCssBundle } from "./css";
import type { ThemeEntry } from "@/config/schemas";

const here = dirname(fileURLToPath(import.meta.url));
const themesRoot = here;

export interface BuiltInThemeSpec {
  name: string;
  dir: string;
}

function _discoverThemesDir(): ReadonlyArray<{ dir: string; name: string }> {
  if (!existsSync(themesRoot)) return [];
  const entries = readdirSync(themesRoot, { withFileTypes: true });
  const themes: { dir: string; name: string }[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(themesRoot, entry.name, "sirenodeck.json");
    if (!existsSync(manifestPath)) continue;
    themes.push({ dir: join(themesRoot, entry.name), name: entry.name });
  }
  return themes;
}

export const BUILT_IN_THEMES: ReadonlyArray<BuiltInThemeSpec> =
  _discoverThemesDir().map(({ dir, name }) => ({ name, dir }));

function discoverThemeManifests(): ReadonlyArray<{ dir: string; name: string }> {
  return _discoverThemesDir();
}

function readAndValidateManifest(
  manifestPath: string,
  expectedName?: string,
): ThemeJsonManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    throw new Error(`Failed to parse theme manifest: ${manifestPath}`);
  }
  const result = ThemeJsonManifestSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid theme manifest in ${manifestPath}: ${result.error.message}`,
    );
  }
  if (expectedName !== undefined && result.data.name !== expectedName) {
    throw new Error(
      `Theme name '${result.data.name}' in ${manifestPath} does not match expected '${expectedName}'`,
    );
  }
  return result.data;
}

function projectAndWriteThemeCss(
  manifest: ThemeJsonManifest,
  themeDir: string,
): { cssPath: string; assetsStyles: string[] } {
  const assetsStyles = (
    manifest.assets?.styles ?? ["./tokens.css", "./components.css"]
  ).map((s) => resolvePath(themeDir, s));
  const cssPath = resolvePath(themeDir, "theme.generated.css");
  const stylesheetContents = assetsStyles.map((p) => {
    try {
      return readFileSync(p, "utf8");
    } catch {
      return `/* stylesheet not found: ${p} */`;
    }
  });
  const generatedCss = buildThemeCssBundle(manifest, stylesheetContents);
  try {
    const cssDir = dirname(cssPath);
    if (!existsSync(cssDir)) mkdirSync(cssDir, { recursive: true });
    writeFileSync(cssPath, generatedCss, "utf8");
  } catch {
    // Non-fatal in test environments where fs is mocked
  }
  return { cssPath, assetsStyles };
}

function buildLoadedTheme(
  manifest: ThemeJsonManifest,
  themeDir: string,
  source: { kind: "builtin"; resolvedPath: string } | { kind: "local"; resolvedPath: string },
): LoadedTheme {
  const { cssPath, assetsStyles } = projectAndWriteThemeCss(manifest, themeDir);
  const frontendPath = manifest.entry
    ? resolvePath(themeDir, manifest.entry)
    : resolvePath(themeDir, "index");
  return {
    name: manifest.name,
    apiVersion: manifest.apiVersion,
    source,
    manifestPath: join(themeDir, "sirenodeck.json"),
    cssPath,
    frontendPath,
    assetsStyles,
  };
}

export function loadBuiltInThemes(): LoadedTheme[] {
  const discovered = discoverThemeManifests();
  return discovered.map(({ dir, name }) => {
    const manifest = readAndValidateManifest(join(dir, "sirenodeck.json"), name);
    return buildLoadedTheme(manifest, dir, { kind: "builtin", resolvedPath: dir });
  });
}

export const registerBuiltInThemes = (registry: AddonRegistry): void => {
  const themes = loadBuiltInThemes();
  for (const theme of themes) {
    registry.loadTheme(theme);
  }
};

export function loadThemeFromPath(
  registry: AddonRegistry,
  themePath: string,
  aliasName?: string,
): LoadedTheme {
  const resolvedPath = resolvePath(themePath);
  const manifestPath = join(resolvedPath, "sirenodeck.json");
  const manifest = readAndValidateManifest(manifestPath);
  const theme = buildLoadedTheme(manifest, resolvedPath, {
    kind: "local",
    resolvedPath,
  });
  registry.loadTheme(theme);
  if (aliasName !== undefined && aliasName !== manifest.name) {
    registry.loadTheme({ ...theme, name: aliasName });
  }
  return theme;
}

export type ResolveThemeOptions = {
  theme: ThemeEntry | undefined;
};

export interface ResolveThemeResult {
  theme: LoadedTheme;
}

export const resolveActiveTheme = (
  registry: AddonRegistry,
  options: ResolveThemeOptions,
): ResolveThemeResult => {
  const { theme: themeEntry } = options;
  if (themeEntry === undefined) {
    return { theme: registry.resolveActiveTheme(undefined) };
  }
  if (typeof themeEntry === "string") {
    return { theme: registry.resolveActiveTheme(themeEntry) };
  }
  const { name: aliasName, path } = themeEntry;
  const loaded = loadThemeFromPath(registry, path, aliasName);
  return { theme: aliasName ? registry.getTheme(aliasName) ?? loaded : loaded };
};
