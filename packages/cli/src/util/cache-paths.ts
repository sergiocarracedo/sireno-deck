import { mkdirSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'

const CACHE_NAME = 'sireno-deck'

const defaultCacheDir = (): string => {
  const xdgCache = process.env['XDG_CACHE_HOME']
  if (xdgCache && xdgCache.length > 0) return join(xdgCache, CACHE_NAME)

  switch (platform) {
    case 'darwin':
      return join(homedir(), 'Library', 'Caches', CACHE_NAME)
    case 'win32':
      return join(process.env['LOCALAPPDATA'] ?? tmpdir(), CACHE_NAME, 'Cache')
    default:
      return join(homedir(), '.cache', CACHE_NAME)
  }
}

export const resolveAddonCacheDir = (): string => {
  const dir = defaultCacheDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export const addonNpmRoot = (
  cacheDir: string = resolveAddonCacheDir(),
): string => join(cacheDir, 'node_modules')

export const addonNpmInstallPath = (
  packageName: string,
  cacheDir: string = resolveAddonCacheDir(),
): string => join(addonNpmRoot(cacheDir), packageName)
