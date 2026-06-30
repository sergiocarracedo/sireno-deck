import { existsSync } from 'node:fs'
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path'

import { getOriginalCwd } from '@/cli/cwd'

export interface FindConfigOptions {
  cwd?: string
  explicitPath?: string
  envVar?: string
  homeDir: string
  xdgConfigHome?: string
  maxDepth?: number
}

export const DEFAULT_CONFIG_FILENAME = 'config.yml'

const resolvePath_ = (p: string, cwd: string): string =>
  isAbsolute(p) ? p : resolvePath(cwd, p)

const walkUpForConfig = (startDir: string, maxDepth: number): string | null => {
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

export const findConfigPath = (options: FindConfigOptions): string | null => {
  const cwd = options.cwd ?? getOriginalCwd()
  if (options.explicitPath) {
    const abs = resolvePath_(options.explicitPath, cwd)
    return existsSync(abs) ? abs : null
  }
  if (options.envVar) {
    const abs = resolvePath_(options.envVar as string, cwd)
    if (existsSync(abs)) return abs
  }
  const maxDepth = options.maxDepth ?? 10
  const walked = walkUpForConfig(cwd, maxDepth)
  if (walked !== null) return walked
  const xdg = options.xdgConfigHome ?? resolvePath(options.homeDir, '.config')
  const xdgConfig = resolvePath(xdg, 'sireno-deck', DEFAULT_CONFIG_FILENAME)
  if (existsSync(xdgConfig)) return xdgConfig
  return null
}
