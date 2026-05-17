import { sessionBus } from "dbus-next"

import type { HostSessionCapability, HostSessionState } from "./host-context.js"

export interface SessionSnapshot {
  capability: HostSessionCapability
  state: HostSessionState
}

export interface SessionMonitor {
  getSnapshot: () => SessionSnapshot
  stop: () => Promise<void> | void
  subscribe: (listener: (snapshot: SessionSnapshot) => void) => () => void
}

export interface SessionMonitorOptions {
  client?: SessionMonitorClient
  platform?: NodeJS.Platform
}

interface SessionMonitorBus {
  disconnect?: () => void
  getProxyObject: (serviceName: string, objectPath: string) => Promise<SessionMonitorProxyObject>
}

interface SessionMonitorProxyObject {
  getInterface: (interfaceName: string) => SessionMonitorProxyInterface
}

interface SessionMonitorProxyInterface {
  GetActive: () => Promise<boolean>
  off?: (eventName: "ActiveChanged", listener: (locked: boolean) => void) => void
  on: (eventName: "ActiveChanged", listener: (locked: boolean) => void) => void
  removeListener?: (eventName: "ActiveChanged", listener: (locked: boolean) => void) => void
}

export interface SessionMonitorClient {
  createLinuxBus: () => SessionMonitorBus
}

const LINUX_SESSION_SERVICE = "org.gnome.ScreenSaver"
const LINUX_SESSION_PATH = "/org/gnome/ScreenSaver"
const LINUX_SESSION_INTERFACE = "org.gnome.ScreenSaver"

const defaultClient: SessionMonitorClient = {
  createLinuxBus: () => sessionBus() as SessionMonitorBus,
}

function createStaticSessionMonitor(snapshot: SessionSnapshot): SessionMonitor {
  const listeners = new Set<(snapshot: SessionSnapshot) => void>()

  return {
    getSnapshot() {
      return snapshot
    },
    stop() {},
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function toSessionState(locked: boolean): HostSessionState {
  return locked ? "locked" : "unlocked"
}

function emitSnapshot(listeners: ReadonlySet<(snapshot: SessionSnapshot) => void>, snapshot: SessionSnapshot): void {
  for (const listener of listeners) {
    listener(snapshot)
  }
}

async function createLinuxSessionMonitor(client: SessionMonitorClient): Promise<SessionMonitor> {
  const bus = client.createLinuxBus()
  const proxyObject = await bus.getProxyObject(LINUX_SESSION_SERVICE, LINUX_SESSION_PATH)
  const sessionInterface = proxyObject.getInterface(LINUX_SESSION_INTERFACE)
  const listeners = new Set<(snapshot: SessionSnapshot) => void>()
  const handleActiveChanged = (locked: boolean) => {
    snapshot = {
      capability: "supported",
      state: toSessionState(locked),
    }
    emitSnapshot(listeners, snapshot)
  }
  let stopped = false
  let snapshot: SessionSnapshot = {
    capability: "supported",
    state: toSessionState(await sessionInterface.GetActive()),
  }

  sessionInterface.on("ActiveChanged", handleActiveChanged)

  return {
    getSnapshot() {
      return snapshot
    },
    stop() {
      if (stopped) {
        return
      }

      stopped = true
      sessionInterface.off?.("ActiveChanged", handleActiveChanged)
      sessionInterface.removeListener?.("ActiveChanged", handleActiveChanged)
      bus.disconnect?.()
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export async function createSessionMonitor(options: SessionMonitorOptions = {}): Promise<SessionMonitor> {
  const client = options.client ?? defaultClient
  const platform = options.platform ?? process.platform

  if (platform === "linux") {
    try {
      return await createLinuxSessionMonitor(client)
    } catch {
      return createStaticSessionMonitor({
        capability: "unsupported",
        state: "unknown",
      })
    }
  }

  return createStaticSessionMonitor({
    capability: "unsupported",
    state: "unknown",
  })
}
