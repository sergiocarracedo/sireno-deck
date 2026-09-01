import { existsSync } from "node:fs"
import { isAbsolute, resolve as resolvePath } from "node:path"

export const isLocalAddonSpec = (spec: string): boolean => {
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/"))
    return true
  if (spec.startsWith("~/") || spec.startsWith("~\\")) return true
  if (
    spec.startsWith("@") &&
    !spec.startsWith("@/") &&
    !spec.startsWith("@\\")
  ) {
    return false
  }
  if (/[\\/]/.test(spec)) return true
  return false
}

const NPM_PACKAGE_NAME_RE =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[\^~]?[a-z0-9.*_-]+)?$/

export const isNpmAddonSpec = (spec: string): boolean => {
  if (isLocalAddonSpec(spec)) return false
  return NPM_PACKAGE_NAME_RE.test(spec)
}

export const expandHome = (spec: string, homeDir: string): string => {
  if (spec === "~") return homeDir
  if (spec.startsWith("~/") || spec.startsWith("~\\"))
    return homeDir + spec.slice(1)
  return spec
}

export interface NormalizeAddonEntry {
  enabled: boolean
  source: string
  isLocal: boolean
  global: boolean
}

export const normalizeAddonEntry = (
  entry: string | { src: string; enabled?: boolean; global?: boolean },
): NormalizeAddonEntry => {
  if (typeof entry === "string") {
    return {
      enabled: true,
      source: entry,
      isLocal: isLocalAddonSpec(entry),
      global: false,
    }
  }
  return {
    enabled: entry.enabled ?? true,
    source: entry.src,
    isLocal: isLocalAddonSpec(entry.src),
    global: entry.global ?? false,
  }
}

export const resolveLocalAddonRoot = (
  source: string,
  configDir: string,
  homeDir: string,
): string => {
  const expanded = expandHome(source, homeDir)
  return isAbsolute(expanded) ? expanded : resolvePath(configDir, expanded)
}

export const addonRootExists = (root: string): boolean => existsSync(root)
