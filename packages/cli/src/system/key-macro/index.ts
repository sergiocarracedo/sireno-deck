import { execa } from 'execa'

import { createDarwinKeyMacroProvider } from './darwin'
import { createLinuxKeyMacroProvider } from './linux'
import { createUnsupportedKeyMacroProvider } from './unsupported'
import { createWindowsKeyMacroProvider } from './windows'

import type {
  KeyMacroExecutor,
  KeyMacroProvider,
  KeyMacroProviderDeps,
} from './provider'

export type { KeyMacroProvider, KeyMacroStep, KeyMacroProviderDeps } from './provider'
export { KeyMacroParseError, parseKeyMacro } from './parser'
export { createUnsupportedKeyMacroProvider } from './unsupported'
export { createDarwinKeyMacroProvider } from './darwin'
export { createLinuxKeyMacroProvider } from './linux'
export { createWindowsKeyMacroProvider } from './windows'

export interface GetKeyMacroProviderOptions extends KeyMacroProviderDeps {
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  executor?: KeyMacroExecutor
}

function isPureWayland(env: NodeJS.ProcessEnv): boolean {
  return env.XDG_SESSION_TYPE === 'wayland' && !env.WAYLAND_DISPLAY
}

function defaultExecutor(): KeyMacroExecutor {
  return {
    async run(program) {
      try {
        const result = await execa('/bin/sh', ['-c', program], {
          reject: false,
        })
        return { code: result.exitCode ?? null, failed: result.failed }
      } catch (error) {
        return { code: null, failed: true }
      }
    },
  }
}

export function getKeyMacroProvider(
  opts: GetKeyMacroProviderOptions,
): KeyMacroProvider {
  const platform = opts.platform ?? process.platform
  const deps: KeyMacroProviderDeps = { logger: opts.logger }
  const executor = opts.executor ?? defaultExecutor()

  switch (platform) {
    case 'linux':
      if (isPureWayland(opts.env ?? process.env)) {
        return createUnsupportedKeyMacroProvider(deps, 'pure-wayland')
      }
      return createLinuxKeyMacroProvider({ ...deps, executor })
    case 'darwin':
      return createDarwinKeyMacroProvider({ ...deps, executor })
    case 'win32':
      return createWindowsKeyMacroProvider({ ...deps, executor })
    default:
      return createUnsupportedKeyMacroProvider(deps, `unknown-platform:${platform}`)
  }
}
