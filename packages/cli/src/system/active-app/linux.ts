import { sessionBus } from 'dbus-next'

import { createWaylandGnomeProvider } from './wayland-gnome'
import type {
  ActiveAppProbe,
  ActiveAppProvider,
  ActiveAppProviderDeps,
  ActiveAppSnapshot,
} from './provider'

const POLL_INTERVAL_MS = 500
const MAX_CONSECUTIVE_POLL_FAILURES = 5

const defaultDbusClient: ActiveAppProviderDeps['dbusClient'] = {
  createSessionBus: () => sessionBus() as never,
}

function defaultProbe(): ActiveAppProbe {
  return {
    async getActiveWindow() {
      const { activeWindow } = await import('get-windows')
      return activeWindow()
    },
  }
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack }
  }
  if (typeof error === 'object' && error !== null) {
    return { ...error }
  }
  return error
}

/**
 * Linux provider with a transparent fallback chain:
 *   1. Start with the legacy get-windows probe (X11/XWayland path).
 *   2. After MAX_CONSECUTIVE_POLL_FAILURES, attempt the GNOME Shell
 *      "Window Calls Extended" extension via DBus as a fallback.
 *   3. Once the fallback is active, never go back to get-windows.
 *
 * The fallback is non-blocking and runs at most once per runtime —
 * we don't want the daemon thrashing between providers on transient
 * XWayland hiccups. On hosts where get-windows is unreachable
 * (e.g. a daemon launched without the user's session env so
 * XWayland isn't visible), the DBus path picks up the slack.
 */
export async function createLinuxProvider(
  deps: ActiveAppProviderDeps,
  // env retained for API compatibility — the new fallback chain no
  // longer needs to gate on XDG_SESSION_TYPE because get-windows
  // failure itself triggers the DBus probe.
  env?: NodeJS.ProcessEnv,
): Promise<ActiveAppProvider> {
  void env
  const probe = deps.probe ?? defaultProbe()
  return createX11Provider(deps, probe)
}

function createX11Provider(
  deps: ActiveAppProviderDeps,
  probe: ActiveAppProbe,
): ActiveAppProvider {
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastName: string | null = null
  let consecutiveFailures = 0
  let stopped = false
  let fallback: ActiveAppProvider | null = null
  let onChangeCb: ((s: ActiveAppSnapshot) => void) | null = null
  let fallbackAttempted = false
  const emit = (
    onChange: (s: ActiveAppSnapshot) => void,
    name: string | null,
  ): void => {
    if (name === lastName) return
    lastName = name
    onChange(name === null ? null : { ownerName: name })
  }
  const tryFallback = async (reason: string): Promise<void> => {
    if (fallbackAttempted) return
    fallbackAttempted = true
    const client = deps.dbusClient ?? defaultDbusClient
    try {
      const next = await createWaylandGnomeProvider({ ...deps, dbusClient: client })
      if (next.supportsActiveApp && onChangeCb) {
        fallback = next
        deps.logger.info(
          { reason },
          'active-app: get-windows unreachable, falling back to GNOME DBus extension',
        )
        next.start(onChangeCb)
      } else {
        deps.logger.info(
          { reason },
          'active-app: GNOME extension probe failed; active-app disabled',
        )
      }
    } catch (error) {
      deps.logger.warn(
        { reason, error: serializeError(error) },
        'active-app: DBus fallback probe threw',
      )
    }
  }
  return {
    supportsActiveApp: true,
    start(onChange) {
      onChangeCb = onChange
      void poll()
      async function poll(): Promise<void> {
        if (stopped) return
        if (fallback) return
        try {
          const win = await probe.getActiveWindow()
          if (win === null || win === undefined) {
            consecutiveFailures += 1
            if (consecutiveFailures === MAX_CONSECUTIVE_POLL_FAILURES) {
              await tryFallback('get-windows returned null repeatedly')
              return
            }
          } else {
            consecutiveFailures = 0
            emit(onChange, win?.owner?.name ?? null)
          }
        } catch (error) {
          consecutiveFailures += 1
          if (consecutiveFailures === MAX_CONSECUTIVE_POLL_FAILURES) {
            deps.logger.warn(
              {
                reason: 'get-windows threw repeatedly',
                error: serializeError(error),
                maxFailures: MAX_CONSECUTIVE_POLL_FAILURES,
              },
              'active-app: get-windows failed repeatedly — falling back to GNOME DBus extension',
            )
            stopped = true
            if (timer) clearTimeout(timer)
            await tryFallback('get-windows threw repeatedly')
            return
          }
        }
        if (!stopped && !fallback) {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        }
      }
    },
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
      fallback?.stop()
    },
  }
}
