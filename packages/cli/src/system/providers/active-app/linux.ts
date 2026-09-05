import type pino from "pino"

import type { ActiveAppProvider, ActiveAppSnapshot } from "../active-app"
import {
  type CommandExecutor,
  type LinuxDbusBus,
  type LinuxDbusProxyObject,
} from "../shared"
import {
  createWaylandGnomeProvider,
  hasWaylandGnomeSession,
  shouldUseWaylandGnomeProvider,
} from "./wayland-gnome"

export interface LinuxActiveAppDeps {
  readonly dbus?: LinuxDbusBus
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
  readonly env?: NodeJS.ProcessEnv
}

const DEFAULT_POLL_MS = 1_000

const parseDbusEvalResult = (
  raw: unknown,
): { wmClass: string; title: string; pid: number | null } | null => {
  if (typeof raw !== "string" || raw.length === 0) return null
  try {
    const parsed = JSON.parse(raw) as {
      wm_class?: string
      title?: string
      pid?: number
    }
    const wmClass = typeof parsed.wm_class === "string" ? parsed.wm_class : ""
    const title = typeof parsed.title === "string" ? parsed.title : ""
    const pid =
      typeof parsed.pid === "number" && Number.isFinite(parsed.pid)
        ? parsed.pid
        : null
    if (wmClass.length === 0 && title.length === 0) return null
    return { wmClass, title, pid }
  } catch {
    return null
  }
}

const readProcName = async (
  executor: CommandExecutor,
): Promise<string | null> => {
  const result = await executor.run("sh", [
    "-c",
    "cat /proc/$$/comm 2>/dev/null || true",
  ])
  const name = result.stdout.trim()
  return name.length > 0 ? name : null
}

const readForegroundProc = async (
  executor: CommandExecutor,
): Promise<{ name: string; pid: number | null } | null> => {
  const winIdResult = await executor.run("sh", [
    "-c",
    "xdotool getactivewindow 2>/dev/null || xprop -root _NET_ACTIVE_WINDOW 2>/dev/null | awk '{print $5}' || true",
  ])
  const winId = winIdResult.stdout.trim()
  if (winId.length === 0) {
    const name = await readProcName(executor)
    return name === null ? null : { name, pid: null }
  }
  const pidResult = await executor.run("sh", [
    "-c",
    `xdotool getwindowpid ${winId} 2>/dev/null || true`,
  ])
  const pid = Number.parseInt(pidResult.stdout.trim(), 10)
  if (!Number.isFinite(pid)) {
    const name = await readProcName(executor)
    return name === null ? null : { name, pid: null }
  }
  const nameResult = await executor.run("sh", [
    "-c",
    `cat /proc/${pid}/comm 2>/dev/null || true`,
  ])
  const name = nameResult.stdout.trim()
  if (name.length === 0) {
    return { name: `pid:${pid}`, pid }
  }
  return { name, pid }
}

const D_BUS_GNOME_SHELL = "org.gnome.Shell"
const D_BUS_GNOME_SHELL_PATH = "/org/gnome/Shell"

const dbusSnapshot = async (
  bus: LinuxDbusBus,
): Promise<ActiveAppSnapshot | null> => {
  const proxy: LinuxDbusProxyObject = await bus.getProxyObject(
    D_BUS_GNOME_SHELL,
    D_BUS_GNOME_SHELL_PATH,
  )
  const iface = proxy.getInterface("org.gnome.Shell")
  if (iface.Eval === undefined) return null
  const result = await iface.Eval(
    "global.display.focus_window && JSON.stringify({wm_class: global.display.focus_window.wm_class, title: global.display.focus_window.title, pid: global.display.focus_window.pid})",
  )
  return parseDbusEvalResult(result) === null
    ? null
    : (() => {
        const parsed = parseDbusEvalResult(result) as {
          wmClass: string
          title: string
          pid: number | null
        }
        return {
          name: parsed.wmClass.length > 0 ? parsed.wmClass : parsed.title,
          windowTitle: parsed.title.length > 0 ? parsed.title : null,
          processId: parsed.pid,
        }
      })()
}

const fallbackSnapshot = async (
  executor: CommandExecutor,
): Promise<ActiveAppSnapshot | null> => {
  const fg = await readForegroundProc(executor)
  if (fg === null) return null
  return {
    name: fg.name,
    windowTitle: null,
    processId: fg.pid,
  }
}

const sameSnapshot = (
  a: ActiveAppSnapshot | null,
  b: ActiveAppSnapshot | null,
): boolean => {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return (
    a.name === b.name &&
    a.windowTitle === b.windowTitle &&
    a.processId === b.processId
  )
}

export const createLinuxActiveAppProvider = async (
  deps: LinuxActiveAppDeps,
): Promise<ActiveAppProvider> => {
  if (
    shouldUseWaylandGnomeProvider(deps.env) ||
    (await hasWaylandGnomeSession({ env: deps.env, executor: deps.executor }))
  ) {
    deps.logger.info(
      "active-app: detected GNOME Wayland session, using 'Window Calls Extended' provider",
    )
    try {
      return await createWaylandGnomeProvider({
        ...(deps.dbus !== undefined ? { dbus: deps.dbus } : {}),
        logger: deps.logger,
        ...(deps.pollIntervalMs !== undefined
          ? { pollIntervalMs: deps.pollIntervalMs }
          : {}),
      })
    } catch (err) {
      // ponytail: extension probe or interface lookup can throw if GNOME Shell
      // is reachable but the extension isn't installed; fall through to the
      // null provider below instead of crashing the daemon.
      deps.logger.warn(
        { err },
        "active-app: GNOME Wayland provider init failed, using null provider",
      )
    }
  }

  const pollMs = deps.pollIntervalMs ?? DEFAULT_POLL_MS
  const subscribers = new Set<(s: ActiveAppSnapshot | null) => void>()
  let last: ActiveAppSnapshot | null = null
  let stopped = false
  const bus: LinuxDbusBus | null = deps.dbus ?? null
  let dbusFailed = false

  const snapshot = async (): Promise<ActiveAppSnapshot | null> => {
    if (bus && !dbusFailed) {
      try {
        const snap = await dbusSnapshot(bus)
        if (snap !== null) return snap
        dbusFailed = true
      } catch (err) {
        deps.logger.debug(
          { err },
          "active-app: D-Bus snapshot failed, falling back to /proc",
        )
        dbusFailed = true
      }
    }
    try {
      return await fallbackSnapshot(deps.executor)
    } catch (err) {
      deps.logger.warn({ err }, "active-app: /proc fallback failed")
      return last
    }
  }

  let interval: ReturnType<typeof setInterval> | null = null
  const start = (): void => {
    if (interval !== null) return
    interval = setInterval(() => {
      if (stopped) return
      void snapshot().then((s) => {
        if (stopped) return
        if (!sameSnapshot(last, s)) {
          last = s
          for (const handler of subscribers) handler(s)
        }
      })
    }, pollMs)
  }

  start()

  return {
    async getActive() {
      return snapshot()
    },
    subscribe(handler) {
      subscribers.add(handler)
      return () => {
        subscribers.delete(handler)
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
        // ignore disconnect failures
      }
    },
  }
}
