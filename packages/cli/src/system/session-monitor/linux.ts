import type pino from "pino"

import {
  createNullSessionProvider,
  type SessionProvider,
  type SessionState,
} from "@/system/provider"

export interface LinuxDbusBus {
  getProxyObject(
    serviceName: string,
    objectPath: string,
  ): Promise<LinuxDbusProxyObject>
  disconnect?(): void
}

export interface LinuxDbusProxyObject {
  getInterface(interfaceName: string): LinuxDbusInterface
}

export interface LinuxDbusInterface {
  GetActive?(): Promise<boolean>
  GetIdletime?(): Promise<number>
  on?(event: string, handler: (...args: unknown[]) => void): void
  off?(event: string, handler: (...args: unknown[]) => void): void
}

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
  if (deps.dbus === undefined) {
    return createNullSessionProvider(deps.logger)
  }
  const idleMs = deps.idleMs ?? 5 * 60 * 1000
  const listeners = new Set<(s: SessionState) => void>()
  let state: SessionState = "unknown"
  let stopped = false
  let idleSupported = false

  try {
    const proxy = await deps.dbus.getProxyObject(
      SCREENSAVER_SERVICE,
      SCREENSAVER_PATH,
    )
    const saver = proxy.getInterface(SCREENSAVER_IFACE)
    const initial = (await saver.GetActive?.()) ?? false
    state = toState(initial)
    saver.on?.("ActiveChanged", (locked: unknown) => {
      if (typeof locked === "boolean") {
        state = toState(locked)
        for (const l of listeners) l(state)
      }
    })
  } catch (err) {
    deps.logger.debug({ err }, "session: ScreenSaver init failed")
    return createNullSessionProvider(deps.logger)
  }

  try {
    const idleProxy = await deps.dbus.getProxyObject(
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

  let interval: ReturnType<typeof setInterval> | null = null
  if (idleSupported) {
    interval = setInterval(() => {
      if (stopped) return
      void deps
        .dbus!.getProxyObject(IDLE_MONITOR_SERVICE, IDLE_MONITOR_PATH)
        .then((p) => p.getInterface(IDLE_MONITOR_IFACE).GetIdletime?.())
        .then((idleMsRaw) => {
          if (
            typeof idleMsRaw === "number" &&
            idleMsRaw > idleMs &&
            state === "unlocked"
          ) {
            state = "unlocked"
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
        deps.dbus?.disconnect?.()
      } catch {
        // ignore
      }
    },
  }
}
