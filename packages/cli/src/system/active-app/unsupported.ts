import type {
  ActiveAppProvider,
  ActiveAppProviderDeps,
} from './provider'

export function createUnsupportedProvider(
  deps: ActiveAppProviderDeps,
  reason: string,
): ActiveAppProvider {
  let warned = false
  return {
    supportsActiveApp: false,
    start(onChange) {
      if (!warned) {
        deps.logger.warn(
          { reason },
          'active-app: not supported on this platform',
        )
        warned = true
      }
      onChange(null)
    },
    stop() {},
  }
}
