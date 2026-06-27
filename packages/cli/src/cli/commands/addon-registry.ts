import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import type { AddonFrontendRef } from "./emulator-mode.ts";

interface ScannedAddon {
  readonly name: string;
  readonly types: ReadonlyArray<string>;
  readonly frontendEntry: string | null;
  readonly publishIntervalMs: number | null;
}

const scanBuiltinAddons = (): ReadonlyArray<ScannedAddon> => {
  const here = dirname(fileURLToPath(import.meta.url));
  const builtinDir = resolvePath(here, "..", "..", "builtin-addons");
  if (!existsSync(builtinDir)) return [];
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const entries = readdirSync(builtinDir, { withFileTypes: true });
  const out: ScannedAddon[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const addonDir = join(builtinDir, entry.name);
    const indexPath = join(addonDir, "index.ts");
    const indexTsxPath = join(addonDir, "index.tsx");
    const indexFile = existsSync(indexPath) ? indexPath : existsSync(indexTsxPath) ? indexTsxPath : null;
    if (indexFile === null) continue;
    let raw: string;
    try {
      raw = readFileSync(indexFile, "utf8");
    } catch {
      continue;
    }
    const typeMatches = raw.matchAll(/type:\s*["']([a-z0-9-]+:[a-z0-9-]+)["']/gi);
    const types = new Set<string>();
    for (const m of typeMatches) {
      if (m[1] !== undefined) types.add(m[1]);
    }
    const frontendMatch = raw.match(/frontend:\s*\{\s*main:\s*["']([^"']+)["']/);
    const frontendEntry = frontendMatch?.[1] !== undefined
      ? resolvePath(addonDir, frontendMatch[1])
      : null;
    const publishMatch = raw.match(/publishIntervalMs:\s*(\d+)/);
    const publishIntervalMs = publishMatch?.[1] !== undefined
      ? Number.parseInt(publishMatch[1], 10)
      : null;
    if (frontendEntry === null && types.size === 0) continue;
    out.push({ name: entry.name, types: [...types], frontendEntry, publishIntervalMs });
  }
  return out;
};

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

export { scanBuiltinAddons, buildAddonByType };
