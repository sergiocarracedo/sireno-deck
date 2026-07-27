import { sessionBus } from "dbus-next"

import type pino from "pino"

import {
  createNullSessionProvider,
  type SessionProvider,
  type SessionState,
} from "../session"
import type { LinuxDbusBus } from "../shared"

export interface LinuxSessionDeps {
  readonly dbus?: LinuxDbusBus
  readonly logger: pino.Logger
  readonly idleMs?: number
}

const SCREENSAVER_SERVICE = "org.gnome.ScreenSaver"
const SCREENSAVER_PATH = "/org/gnome/ScreenSaver"
const SCREENSAVER_IFACE = "org.gnome.ScreenSaver"
const IDLE_MONITOR_SERVICE = "org.gnome.Mutter.IdleMonitor"
const IDLE_MONITOR_PATH = "/org/gnome/Mutter/IdleMonitor/Core"
const IDLE_MONITOR_IFACE = "org.gnome.Mutter.IdleMonitor"

const toState = (locked: boolean): SessionState =>
  locked ? "locked" : "unlocked"

export const createLinuxSessionProvider = async (
  deps: LinuxSessionDeps,
): Promise<SessionProvider> => {
  const idleMs = deps.idleMs ?? 5 * 60 * 1000
  const listeners = new Set<(s: SessionState) => void>()
  let state: SessionState = "unknown"
  let stopped = false
  let idleSupported = false
  let bus: LinuxDbusBus | null = deps.dbus ?? null
  if (bus === null) {
    try {
      bus = (await sessionBus()) as unknown as LinuxDbusBus
    } catch (err) {
      deps.logger.debug({ err }, "session: dbus sessionBus unavailable")
      return createNullSessionProvider(deps.logger)
    }
  }

  let screensaverOk = false
  try {
    const proxy = await bus.getProxyObject(
      SCREENSAVER_SERVICE,
      SCREENSAVER_PATH,
    )
    const saver = proxy.getInterface(SCREENSAVER_IFACE)
    const initial = (await saver.GetActive?.()) ?? false
    state = toState(initial)
    saver.on?.("ActiveChanged", (locked: unknown) => {
      if (typeof locked === "boolean") {
        const next = toState(locked)
        if (next !== state) {
          state = next
          for (const l of listeners) l(state)
        }
      }
    })
    screensaverOk = true
  } catch (err) {
    // ponytail: ScreenSaver can be unavailable on non-GNOME sessions; keep
    // the provider alive so the idle-monitor fallback can still fire.
    deps.logger.debug({ err }, "session: ScreenSaver init failed")
  }

  try {
    const idleProxy = await bus.getProxyObject(
      IDLE_MONITOR_SERVICE,
      IDLE_MONITOR_PATH,
    )
    const idleIface = idleProxy.getInterface(IDLE_MONITOR_IFACE)
    await idleIface.GetIdletime?.()
    idleSupported = true
  } catch (err) {
    deps.logger.debug(
      { err },
      "session: IdleMonitor init failed; idle polling disabled",
    )
  }

  if (!screensaverOk && !idleSupported) {
    deps.logger.debug("session: no lock source available, returning null")
    return createNullSessionProvider(deps.logger)
  }

  void screensaverOk

  let interval: ReturnType<typeof setInterval> | null = null
  if (idleSupported) {
    interval = setInterval(() => {
      if (stopped) return
      void bus!
        .getProxyObject(IDLE_MONITOR_SERVICE, IDLE_MONITOR_PATH)
        .then((p) => p.getInterface(IDLE_MONITOR_IFACE).GetIdletime?.())
        .then((idleMsRaw) => {
          // ponytail: an idle-timeout fires the lock transition (not the
          // previous no-op `state = "unlocked"`) and only when the state
          // actually changed to avoid redundant listener notifications.
          if (
            typeof idleMsRaw === "number" &&
            idleMsRaw > idleMs &&
            state === "unlocked"
          ) {
            state = "locked"
            for (const l of listeners) l(state)
          }
        })
        .catch(() => undefined)
    }, 5_000)
  }

  return {
    getState() {
      return state
    },
    subscribe(handler) {
      listeners.add(handler)
      return () => {
        listeners.delete(handler)
      }
    },
    async stop() {
      stopped = true
      if (interval !== null) {
        clearInterval(interval)
        interval = null
      }
      try {
        bus?.disconnect?.()
      } catch {
        // ignore
      }
    },
  }
}
