import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve as resolvePath } from "node:path";

import type { AddonManifest } from "./api.ts";

export interface ReadManifestOptions {
  addonRoot: string;
}

export interface ReadManifestResult {
  manifest: AddonManifest;
  packageJsonPath: string;
}

export const readManifest = ({ addonRoot }: ReadManifestOptions): ReadManifestResult => {
  const absoluteRoot = isAbsolute(addonRoot) ? addonRoot : resolvePath(process.cwd(), addonRoot);
  if (!statSync(absoluteRoot, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Addon root is not a directory: ${absoluteRoot}`);
  }
  const packageJsonPath = resolvePath(absoluteRoot, "package.json");
  const raw = readFileSync(packageJsonPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`Invalid package.json in ${packageJsonPath}`);
  }
  const obj = parsed as Record<string, unknown>;
  const sirenoAddon = obj["sirenoAddon"];
  if (sirenoAddon === undefined) {
    throw new Error(`Addon package.json missing 'sirenoAddon' field: ${packageJsonPath}`);
  }
  if (sirenoAddon === null || typeof sirenoAddon !== "object") {
    throw new Error(`Addon 'sirenoAddon' must be an object: ${packageJsonPath}`);
  }
  const sa = sirenoAddon as Record<string, unknown>;
  const apiVersion = sa["apiVersion"];
  const main = sa["main"];
  if (typeof apiVersion !== "number") {
    throw new Error(`Addon 'sirenoAddon.apiVersion' must be a number: ${packageJsonPath}`);
  }
  if (typeof main !== "string" || main.length === 0) {
    throw new Error(`Addon 'sirenoAddon.main' must be a non-empty string: ${packageJsonPath}`);
  }
  const name = typeof obj["name"] === "string" ? obj["name"] : undefined;
  const version = typeof obj["version"] === "string" ? obj["version"] : undefined;
  const description = typeof obj["description"] === "string" ? obj["description"] : undefined;
  const frontendRaw = sa["frontend"];
  let frontend: AddonManifest["frontend"];
  if (frontendRaw !== undefined) {
    if (frontendRaw === null || typeof frontendRaw !== "object") {
      throw new Error(`Addon 'sirenoAddon.frontend' must be an object: ${packageJsonPath}`);
    }
    const f = frontendRaw as Record<string, unknown>;
    if (typeof f["main"] !== "string" || f["main"].length === 0) {
      throw new Error(
        `Addon 'sirenoAddon.frontend.main' must be a non-empty string: ${packageJsonPath}`,
      );
    }
    const styles = f["styles"];
    frontend = {
      main: f["main"],
      ...(Array.isArray(styles) && styles.every((s) => typeof s === "string")
        ? { styles: styles as string[] }
        : {}),
    };
  }
  return {
    manifest: {
      apiVersion,
      main,
      ...(name !== undefined ? { name } : {}),
      ...(version !== undefined ? { version } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(frontend !== undefined ? { frontend } : {}),
    },
    packageJsonPath,
  };
};
