import { createUnsupportedProvider } from './unsupported'
import type {
  ActiveAppProvider,
  ActiveAppProviderDeps,
  ActiveAppSnapshot,
} from './provider'

const POLL_INTERVAL_MS = 500

function isPureWayland(env: NodeJS.ProcessEnv): boolean {
  return env.XDG_SESSION_TYPE === 'wayland' && !env.WAYLAND_DISPLAY
}

export function createLinuxProvider(
  deps: ActiveAppProviderDeps,
  env: NodeJS.ProcessEnv = process.env,
): ActiveAppProvider {
  if (isPureWayland(env)) {
    return createUnsupportedProvider(deps, 'pure-wayland')
  }

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
          deps.logger.warn({ error }, 'active-app: linux poll failed')
          // Keep polling — next attempt may succeed
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS)
      }
    },
    stop() {
      if (timer) clearTimeout(timer)
    },
  }
}
