import { dirname, isAbsolute, join, relative } from "node:path"

export interface ResolveIconPathOptions {
  readonly addonDirs?: ReadonlyMap<string, string>
  readonly baseDirs?: ReadonlyArray<string>
}

export const resolveIconPath = (
  icon: string,
  options: ResolveIconPathOptions = {},
): string | undefined => {
  if (icon === undefined) return undefined

  if (icon.startsWith("icon://")) return icon
  if (icon.startsWith("data:")) return icon
  if (icon.startsWith("https://")) return icon
  if (icon.startsWith("http://")) return icon
  if (icon.startsWith("file://")) return icon
  if (isAbsolute(icon)) return icon

  if (icon.startsWith("addon://")) {
    const match = /^addon:\/\/([^/]+)\/(.*)$/.exec(icon)
    if (match) {
      const [, addonName, assetPath] = match
      const addonDir = options.addonDirs?.get(addonName)
      if (addonDir) return join(addonDir, assetPath)
    }
    return icon
  }

  if (icon.startsWith("builtin://")) {
    const assetPath = icon.slice("builtin://".length)
    const builtinDir = options.addonDirs?.get("builtin")
    if (builtinDir) return join(builtinDir, assetPath)
    return icon
  }

  for (const baseDir of options.baseDirs ?? []) {
    const candidate = join(baseDir, icon)
    return candidate
  }

  return icon
}
