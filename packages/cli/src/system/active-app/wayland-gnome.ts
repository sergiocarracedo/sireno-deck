import { createUnsupportedProvider } from './unsupported'
import type {
  ActiveAppProvider,
  ActiveAppProviderDeps,
  ActiveAppSnapshot,
  DbusBus,
  DbusClient,
} from './provider'

const POLL_INTERVAL_MS = 500
const MAX_CONSECUTIVE_POLL_FAILURES = 5

const WAYLAND_GNOME_SERVICE = 'org.gnome.Shell'
const WAYLAND_GNOME_PATH = '/org/gnome/Shell/Extensions/WindowsExt'
const WAYLAND_GNOME_INTERFACE = 'org.gnome.Shell.Extensions.WindowsExt'
const EXTENSION_INSTALL_URL =
  'https://extensions.gnome.org/extension/4974/window-calls-extended/'

interface ProbeResult {
  bus: DbusBus
  focusClass: () => Promise<string>
}

function probeExtension(
  deps: ActiveAppProviderDeps,
): Promise<ProbeResult | null> {
  const client = deps.dbusClient
  if (!client) return Promise.resolve(null)

  return new Promise((resolve) => {
    const bus = createSessionBusOrLog(deps, client)
    if (!bus) {
      resolve(null)
      return
    }

    bus
      .getProxyObject(WAYLAND_GNOME_SERVICE, WAYLAND_GNOME_PATH)
      .then((proxy) => {
        const iface = proxy.getInterface(WAYLAND_GNOME_INTERFACE)
        const focusClass = iface.FocusClass
        if (typeof focusClass !== 'function') {
          bus.disconnect?.()
          resolve(null)
          return
        }
        resolve({ bus, focusClass: focusClass.bind(iface) })
      })
      .catch((error) => {
        deps.logger.info(
          { error, installUrl: EXTENSION_INSTALL_URL },
          'active-app: GNOME Window Calls Extended extension not detected — install it to enable active-app detection on Wayland',
        )
        bus.disconnect?.()
        resolve(null)
      })
  })
}

function createSessionBusOrLog(
  deps: ActiveAppProviderDeps,
  client: DbusClient,
): DbusBus | null {
  try {
    return client.createSessionBus()
  } catch (error) {
    deps.logger.info(
      { error, installUrl: EXTENSION_INSTALL_URL },
      'active-app: GNOME session bus unavailable on this host — install the GNOME Shell extension to enable active-app detection',
    )
    return null
  }
}

export async function createWaylandGnomeProvider(
  deps: ActiveAppProviderDeps,
): Promise<ActiveAppProvider> {
  const probe = await probeExtension(deps)
  if (!probe) {
    return createUnsupportedProvider(deps, 'gnome-extension-missing')
  }
  const activeProbe = probe

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
          const raw = await activeProbe.focusClass()
          consecutiveFailures = 0
          const name = typeof raw === 'string' && raw.length > 0 ? raw : null
          emit(onChange, name)
        } catch (error) {
          consecutiveFailures += 1
          if (consecutiveFailures === MAX_CONSECUTIVE_POLL_FAILURES) {
            deps.logger.warn(
              { error, maxFailures: MAX_CONSECUTIVE_POLL_FAILURES },
              'active-app: wayland-gnome poll failed repeatedly — disabling poller',
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
      activeProbe.bus.disconnect?.()
    },
  }
}
