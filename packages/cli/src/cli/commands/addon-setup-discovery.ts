import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve, sep } from "node:path"
import { loadConfig } from "@/config/loader"
import { normalizeAddonEntry, resolveLocalAddonRoot } from "@/addon/spec"

export interface AddonSetup {
  name: string
  source: string
  setupPath: string
}

export const packageNameOf = (source: string): string =>
  source.startsWith("@") ? source.replace(/@[^/]+$/, "") : source.split("@")[0]!

export const discoverAddonSetups = (
  configPath: string,
  globalRoots: readonly string[] = [],
  cacheRoot?: string,
): AddonSetup[] => {
  const { config, configDir } = loadConfig({ configPath })
  const result: AddonSetup[] = []
  for (const raw of config.addons ?? []) {
    const entry = normalizeAddonEntry(raw)
    if (!entry.enabled) continue
    const name = packageNameOf(entry.source)
    const roots = entry.isLocal
      ? [resolveLocalAddonRoot(entry.source, configDir, homedir())]
      : [
          join(configDir, "node_modules", name),
          ...(entry.global ? globalRoots.map((root) => join(root, name)) : []),
          ...(cacheRoot ? [join(cacheRoot, name)] : []),
        ]
    const root = roots.find((path) => existsSync(join(path, "sirenodeck.json")))
    if (!root) continue
    try {
      const manifest = JSON.parse(
        readFileSync(join(root, "sirenodeck.json"), "utf8"),
      ) as { kind?: string; name?: string; setupEntry?: string }
      if (
        manifest.kind !== "addon" ||
        typeof manifest.name !== "string" ||
        typeof manifest.setupEntry !== "string"
      )
        continue
      const setupPath = resolve(root, manifest.setupEntry)
      if (!setupPath.startsWith(resolve(root) + sep) || !existsSync(setupPath))
        continue
      result.push({ name: manifest.name, source: entry.source, setupPath })
    } catch {
      continue
    }
  }
  return result
}
