import { createDarwinProvider } from './darwin'
import { createLinuxProvider } from './linux'
import { createUnsupportedProvider } from './unsupported'
import { createWindowsProvider } from './windows'
import type {
  ActiveAppProvider,
  ActiveAppProviderDeps,
} from './provider'

export type { ActiveAppProvider, ActiveAppSnapshot } from './provider'
export type { ActiveAppMonitor } from './active-app-monitor'

export interface GetActiveAppProviderOptions extends ActiveAppProviderDeps {
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
}

export function getActiveAppProvider(
  opts: GetActiveAppProviderOptions,
): ActiveAppProvider {
  const platform = opts.platform ?? process.platform
  const deps: ActiveAppProviderDeps = { logger: opts.logger }
  switch (platform) {
    case 'linux':
      return createLinuxProvider(deps, opts.env)
    case 'darwin':
      return createDarwinProvider(deps)
    case 'win32':
      return createWindowsProvider(deps)
    default:
      return createUnsupportedProvider(deps, `unknown-platform:${platform}`)
  }
}
