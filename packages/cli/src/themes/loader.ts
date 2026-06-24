import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

import { SIRENO_ADDON_API_VERSION } from "@/addon/api-types.ts";
import type { AddonRegistry } from "@/addon/registry.ts";
import type { LoadedTheme } from "@/addon/api.ts";

const here = dirname(fileURLToPath(import.meta.url));

export interface BuiltInThemeSpec {
  name: string;
  dir: string;
}

export const BUILT_IN_THEMES: ReadonlyArray<BuiltInThemeSpec> = [
  { name: "default", dir: resolvePath(here, "default") },
  { name: "light", dir: resolvePath(here, "light") },
];

export const registerBuiltInThemes = (registry: AddonRegistry): void => {
  for (const spec of BUILT_IN_THEMES) {
    const theme: LoadedTheme = {
      name: spec.name,
      apiVersion: SIRENO_ADDON_API_VERSION,
      source: { kind: "builtin", resolvedPath: spec.dir },
      cssPath: resolvePath(spec.dir, "theme.css"),
      frontendPath: resolvePath(spec.dir, "index.tsx"),
    };
    registry.loadTheme(theme);
  }
};

export interface ResolveThemeOptions {
  theme: string | undefined;
}

export interface ResolveThemeResult {
  theme: LoadedTheme;
}

export const resolveActiveTheme = (
  registry: AddonRegistry,
  options: ResolveThemeOptions,
): ResolveThemeResult => {
  const theme = registry.resolveActiveTheme(options.theme);
  return { theme };
};
