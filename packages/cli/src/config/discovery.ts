import { existsSync } from "node:fs"
import { dirname, isAbsolute, resolve as resolvePath } from "node:path"

import { getOriginalCwd } from "@/cli/cwd"

export interface FindConfigOptions {
  cwd?: string
  explicitPath?: string
  envVar?: string
  homeDir: string
  xdgConfigHome?: string
}

export const DEFAULT_CONFIG_FILENAME = "config.yml"
export const XDG_CONFIG_SUBDIR = "sireno-deck"

const resolvePath_ = (p: string, cwd: string): string =>
  isAbsolute(p) ? p : resolvePath(cwd, p)

// ponytail: precedence is cli arg → ~/.config/sireno-deck/config.yml →
// ./config.yml (run folder / cwd). Parent-directory walk removed: the run
// folder is the canonical place for a project config, and silently walking
// up makes a "missing config" failure look like a "found some other config"
// one. The previous walk also kept selectors scripts out of the canoe.
export const findConfigPath = (options: FindConfigOptions): string | null => {
  const cwd = options.cwd ?? getOriginalCwd()
  if (options.explicitPath) {
    const abs = resolvePath_(options.explicitPath, cwd)
    return existsSync(abs) ? abs : null
  }
  if (options.envVar) {
    const abs = resolvePath_(options.envVar, cwd)
    if (existsSync(abs)) return abs
  }
  const xdgRoot =
    options.xdgConfigHome ?? resolvePath(options.homeDir, ".config")
  const xdgConfig = resolvePath(
    xdgRoot,
    XDG_CONFIG_SUBDIR,
    DEFAULT_CONFIG_FILENAME,
  )
  if (existsSync(xdgConfig)) return xdgConfig
  const cwdConfig = resolvePath(cwd, DEFAULT_CONFIG_FILENAME)
  if (existsSync(cwdConfig)) return cwdConfig
  return null
}

// ponytail: kept for the parent-walk test fixture — call sites should use
// findConfigPath. Removing the export would break the existing test, so
// the helper stays here as an explicit escape hatch with no callers.
export const walkUpForConfig = (
  startDir: string,
  maxDepth: number,
): string | null => {
  let current = startDir
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const candidate = resolvePath(current, DEFAULT_CONFIG_FILENAME)
    if (existsSync(candidate)) return candidate
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
  return null
}
