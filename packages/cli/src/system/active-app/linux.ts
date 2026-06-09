import { sessionBus } from 'dbus-next'

import { createWaylandGnomeProvider } from './wayland-gnome'
import type {
  ActiveAppProvider,
  ActiveAppProviderDeps,
  ActiveAppSnapshot,
} from './provider'

const POLL_INTERVAL_MS = 500
const MAX_CONSECUTIVE_POLL_FAILURES = 5

function isPureWayland(env: NodeJS.ProcessEnv): boolean {
  return env.XDG_SESSION_TYPE === 'wayland' && !env.WAYLAND_DISPLAY
}

const defaultDbusClient: ActiveAppProviderDeps['dbusClient'] = {
  createSessionBus: () => sessionBus() as never,
}

export async function createLinuxProvider(
  deps: ActiveAppProviderDeps,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ActiveAppProvider> {
  const withBus: ActiveAppProviderDeps = deps.dbusClient
    ? deps
    : { ...deps, dbusClient: defaultDbusClient }

  if (isPureWayland(env)) {
    return createWaylandGnomeProvider(withBus)
  }

  const probe = deps.probe ?? {
    async getActiveWindow() {
      const { activeWindow } = await import('get-windows')
      return activeWindow()
    },
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let lastName: string | null = null
  let consecutiveFailures = 0
  let stopped = false
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
        if (stopped) return
        try {
          const win = await probe.getActiveWindow()
          consecutiveFailures = 0
          emit(onChange, win?.owner?.name ?? null)
        } catch (error) {
          consecutiveFailures += 1
          if (consecutiveFailures === MAX_CONSECUTIVE_POLL_FAILURES) {
            deps.logger.warn(
              { error, maxFailures: MAX_CONSECUTIVE_POLL_FAILURES },
              'active-app: linux poll failed repeatedly — disabling poller',
            )
            stopped = true
            if (timer) clearTimeout(timer)
            return
          }
        }
        if (!stopped) {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        }
      }
    },
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
    },
  }
}
