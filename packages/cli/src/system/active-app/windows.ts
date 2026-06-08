import type {
  ActiveAppProvider,
  ActiveAppProviderDeps,
  ActiveAppSnapshot,
} from './provider'

const POLL_INTERVAL_MS = 500

export function createWindowsProvider(
  deps: ActiveAppProviderDeps,
): ActiveAppProvider {
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastName: string | null = null
  const emit = (
    onChange: (s: ActiveAppSnapshot) => void,
    name: string | null,
  ): void => {
    if (name === lastName) return
    lastName = name
    onChange(name === null ? null : { ownerName: name })
  }
  return {
    supportsActiveApp: true,
    start(onChange) {
      void poll()
      async function poll(): Promise<void> {
        try {
          const { activeWindow } = await import('get-windows')
          const win = await activeWindow()
          emit(onChange, win?.owner?.name ?? null)
        } catch (error) {
          deps.logger.warn({ error }, 'active-app: windows poll failed')
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS)
      }
    },
    stop() {
      if (timer) clearTimeout(timer)
    },
  }
}
