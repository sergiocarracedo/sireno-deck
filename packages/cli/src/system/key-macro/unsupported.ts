import type {
  KeyMacroProvider,
  KeyMacroProviderDeps,
} from './provider'

export function createUnsupportedKeyMacroProvider(
  deps: KeyMacroProviderDeps,
  reason: string,
): KeyMacroProvider {
  let warned = false
  return {
    supportsKeyMacro: false,
    async send() {
      if (!warned) {
        deps.logger.warn(
          { reason },
          'key-macro: not supported on this platform',
        )
        warned = true
      }
    },
  }
}
