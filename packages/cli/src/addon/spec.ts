import { existsSync } from "node:fs";
import { isAbsolute, resolve as resolvePath } from "node:path";

export const isLocalAddonSpec = (spec: string): boolean => {
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) return true;
  if (spec.startsWith("~/") || spec.startsWith("~\\")) return true;
  if (spec.startsWith("@") && !spec.startsWith("@/") && !spec.startsWith("@\\")) return false;
  if (/[\\/]/.test(spec)) return true;
  return false;
};

export const expandHome = (spec: string, homeDir: string): string => {
  if (spec === "~") return homeDir;
  if (spec.startsWith("~/") || spec.startsWith("~\\")) return homeDir + spec.slice(1);
  return spec;
};

export interface NormalizeAddonEntry {
  enabled: boolean;
  source: string;
  isLocal: boolean;
}

export const normalizeAddonEntry = (
  entry: string | { source: string; enabled?: boolean },
): NormalizeAddonEntry => {
  if (typeof entry === "string") {
    return {
      enabled: true,
      source: entry,
      isLocal: isLocalAddonSpec(entry),
    };
  }
  return {
    enabled: entry.enabled ?? true,
    source: entry.source,
    isLocal: isLocalAddonSpec(entry.source),
  };
};

export const resolveLocalAddonRoot = (
  source: string,
  configDir: string,
  homeDir: string,
): string => {
  const expanded = expandHome(source, homeDir);
  return isAbsolute(expanded) ? expanded : resolvePath(configDir, expanded);
};

export const addonRootExists = (root: string): boolean => existsSync(root);
