import { readFileSync, readdirSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import type { AddonPoller, AddonPollerChannel, AddonManifest } from "@/addon/api-types";

export interface ScannedAddon {
  readonly name: string;
  readonly types: ReadonlyArray<string>;
  readonly frontendEntry: string | null;
  readonly publishIntervalMs: number | null;
  readonly pollerEntry: string | null;
}

export interface AddonFrontendRef {
  readonly name: string;
  readonly frontendEntry: string | null;
}

const buildAddonByType = (
  scanned: ReadonlyArray<ScannedAddon>,
): Map<string, AddonFrontendRef> => {
  const map = new Map<string, AddonFrontendRef>();
  for (const addon of scanned) {
    for (const type of addon.types) {
      if (!map.has(type)) {
        map.set(type, { name: addon.name, frontendEntry: addon.frontendEntry });
      }
    }
  }
  return map;
};

export const collectBuiltinAddonRegistry = (): {
  scanned: ReadonlyArray<ScannedAddon>;
  byType: Map<string, AddonFrontendRef>;
} => {
  const scanned = scanBuiltinAddons();
  return { scanned, byType: buildAddonByType(scanned) };
};

const here = dirname(fileURLToPath(import.meta.url));
const builtinDir = resolvePath(here, "..", "..", "builtin-addons");

const scanAddonDir = (addonDir: string, addonName: string): ScannedAddon | null => {
  const indexPath = join(addonDir, "index");
  const indexTsxPath = join(addonDir, "index");
  const indexFile = existsSync(indexPath) ? indexPath : existsSync(indexTsxPath) ? indexTsxPath : null;
  if (indexFile === null) return null;
  let raw: string;
  try {
    raw = readFileSync(indexFile, "utf8");
  } catch {
    return null;
  }
  const buttonsDir = join(addonDir, "buttons");
  const buttonsIndexPath = existsSync(join(buttonsDir, "index"))
    ? join(buttonsDir, "index")
    : null;
  const buttonsSources: string[] = [];
  if (buttonsIndexPath !== null) {
    try {
      buttonsSources.push(readFileSync(buttonsIndexPath, "utf8"));
    } catch {
      // ignore
    }
  }
  if (existsSync(buttonsDir)) {
    for (const f of readdirSync(buttonsDir, { withFileTypes: true })) {
      if (!f.isFile()) continue;
      if (!/\.tsx?$/.test(f.name)) continue;
      if (f.name === "index") continue;
      try {
        buttonsSources.push(readFileSync(join(buttonsDir, f.name), "utf8"));
      } catch {
        // ignore
      }
    }
  }
  const scanFrom = (source: string): Set<string> => {
    const out = new Set<string>();
    for (const m of source.matchAll(/type:\s*["']([a-z0-9-]+:[a-z0-9-]+)["']/gi)) {
      if (m[1] !== undefined) out.add(m[1]);
    }
    return out;
  };
  const allSources = [raw, ...buttonsSources];
  const types = scanFrom(raw);
  for (const src of buttonsSources) {
    for (const t of scanFrom(src)) types.add(t);
  }
  let frontendEntry: string | null = null;
  for (const src of allSources) {
    const match = src.match(/frontend:\s*\{\s*main:\s*["']([^"']+)["']/);
    if (match !== null) {
      frontendEntry = resolvePath(addonDir, match[1]!);
      break;
    }
  }
  let publishIntervalMs: number | null = null;
  for (const src of allSources) {
    const match = src.match(/publishIntervalMs:\s*(\d+)/);
    if (match !== null) {
      publishIntervalMs = Number.parseInt(match[1]!, 10);
      break;
    }
  }
  const pollerEntry = existsSync(join(addonDir, "poller"))
    ? join(addonDir, "poller")
    : null;
  if (frontendEntry === null && types.size === 0 && pollerEntry === null) return null;
  return { name: addonName, types: [...types], frontendEntry, publishIntervalMs, pollerEntry };
};

const scanBuiltinAddons = (): ReadonlyArray<ScannedAddon> => {
  if (!existsSync(builtinDir)) return [];
  const entries = readdirSync(builtinDir, { withFileTypes: true });
  const out: ScannedAddon[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const scanned = scanAddonDir(join(builtinDir, entry.name), entry.name);
    if (scanned !== null) out.push(scanned);
  }
  return out;
};

const matchesManifest = (manifest: AddonManifest, addonName: string): boolean => {
  if (manifest.name !== undefined && manifest.name !== addonName) return false;
  if (manifest.publishIntervalMs === undefined) return false;
  return true;
};

export interface DiscoveredAddonPoller {
  readonly addonName: string;
  readonly channels: ReadonlyArray<AddonPollerChannel>;
}

export interface AddonPollerDependencies {
  readonly executor?: unknown;
  readonly mediaProvider?: unknown;
  readonly brightnessProvider?: unknown;
}

export const discoverAddonPollers = async (
  deps: AddonPollerDependencies,
  scanned: ReadonlyArray<ScannedAddon>,
): Promise<ReadonlyArray<DiscoveredAddonPoller>> => {
  const out: DiscoveredAddonPoller[] = [];
  for (const addon of scanned) {
    if (addon.pollerEntry === null) continue;
    const manifest: AddonManifest = {
      apiVersion: 3,
      name: addon.name,
      ...(addon.publishIntervalMs !== null
        ? { publishIntervalMs: addon.publishIntervalMs }
        : {}),
    };
    if (!matchesManifest(manifest, addon.name)) continue;
    try {
      const mod = (await import(addon.pollerEntry)) as {
        createPoller?: (deps: AddonPollerDependencies) => AddonPoller;
      };
      if (typeof mod.createPoller !== "function") continue;
      const poller = mod.createPoller(deps);
      if (poller.channels.length === 0) continue;
      out.push({ addonName: addon.name, channels: poller.channels });
    } catch {
      // Poller failed to load; skip.
    }
  }
  return out;
};

export { scanBuiltinAddons };
