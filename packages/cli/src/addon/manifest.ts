import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve as resolvePath } from "node:path";

import { getOriginalCwd } from "@/cli/cwd";

import type { AddonManifest } from "./api";

export interface ReadManifestOptions {
  addonRoot: string;
}

export interface ReadManifestResult {
  manifest: AddonManifest;
  packageJsonPath: string;
}

export const readManifest = ({ addonRoot }: ReadManifestOptions): ReadManifestResult => {
  const absoluteRoot = isAbsolute(addonRoot) ? addonRoot : resolvePath(getOriginalCwd(), addonRoot);
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
  if (typeof apiVersion !== "number") {
    throw new Error(`Addon 'sirenoAddon.apiVersion' must be a number: ${packageJsonPath}`);
  }
  const kindRaw = sa["kind"];
  const kind: AddonManifest["kind"] =
    kindRaw === "theme" ? "theme" : kindRaw === "runtime" ? "runtime" : "runtime";
  const mainRaw = sa["main"];
  const main: AddonManifest["main"] =
    typeof mainRaw === "string" && mainRaw.length > 0 ? mainRaw : undefined;
  if (kind === "runtime" && main === undefined) {
    throw new Error(`Addon 'sirenoAddon.main' must be a non-empty string: ${packageJsonPath}`);
  }
  const cssRaw = sa["css"];
  const css: AddonManifest["css"] =
    typeof cssRaw === "string" && cssRaw.length > 0 ? cssRaw : undefined;
  if (kind === "theme" && css === undefined) {
    throw new Error(`Theme addon 'sirenoAddon.css' must be a non-empty string: ${packageJsonPath}`);
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
  if (kind === "theme" && frontend === undefined) {
    throw new Error(`Theme addon 'sirenoAddon.frontend' is required: ${packageJsonPath}`);
  }
  return {
    manifest: {
      apiVersion,
      kind,
      ...(main !== undefined ? { main } : {}),
      ...(css !== undefined ? { css } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(version !== undefined ? { version } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(frontend !== undefined ? { frontend } : {}),
    },
    packageJsonPath,
  };
};
