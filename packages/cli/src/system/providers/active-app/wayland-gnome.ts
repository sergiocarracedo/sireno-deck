import { sessionBus } from "dbus-next"

import type pino from "pino"

import type { ActiveAppProvider, ActiveAppSnapshot } from "../active-app"
import {
  logNull,
  type CommandExecutor,
  type LinuxDbusBus,
  type LinuxDbusProxyObject,
} from "../shared"

export interface WaylandGnomeDeps {
  readonly dbus?: LinuxDbusBus
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
}

const DEFAULT_POLL_MS = 500
const MAX_CONSECUTIVE_POLL_FAILURES = 5
const PROBE_TIMEOUT_MS = 3_000

const GNOME_SHELL_SERVICE = "org.gnome.Shell"
const GNOME_EXTENSION_PATH = "/org/gnome/Shell/Extensions/WindowsExt"
const GNOME_EXTENSION_IFACE = "org.gnome.Shell.Extensions.WindowsExt"
export const EXTENSION_INSTALL_URL =
  "https://extensions.gnome.org/extension/4974/window-calls-extended/"

const serializeError = (error: unknown): unknown => {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, stack: error.stack }
  }
  if (typeof error === "object" && error !== null) {
    return { ...error }
  }
  return error
}

const isGnomeDesktop = (env: NodeJS.ProcessEnv): boolean => {
  const desktop = env["XDG_CURRENT_DESKTOP"] ?? ""
  return desktop.toUpperCase().includes("GNOME")
}

const isWaylandSession = (env: NodeJS.ProcessEnv): boolean => {
  const sessionType = env["XDG_SESSION_TYPE"] ?? ""
  if (sessionType === "wayland") return true
  return env["WAYLAND_DISPLAY"] !== undefined && env["WAYLAND_DISPLAY"] !== ""
}

export const shouldUseWaylandGnomeProvider = (
  env: NodeJS.ProcessEnv = process.env,
): boolean => isWaylandSession(env) && isGnomeDesktop(env)

const sessionProperty = (output: string, name: string): string => {
  const line = output
    .split("\n")
    .find((candidate) => candidate.startsWith(`${name}=`))
  return line?.slice(name.length + 1) ?? ""
}

// A systemd user service does not necessarily inherit the graphical session
// variables. Ask logind for the user's active session before falling back.
export const hasWaylandGnomeSession = async ({
  env = process.env,
  executor,
}: {
  readonly env?: NodeJS.ProcessEnv
  readonly executor: CommandExecutor
}): Promise<boolean> => {
  if (shouldUseWaylandGnomeProvider(env)) return true
  if (
    env["XDG_SESSION_TYPE"] !== undefined ||
    env["WAYLAND_DISPLAY"] !== undefined ||
    env["DISPLAY"] !== undefined ||
    env["XDG_CURRENT_DESKTOP"] !== undefined
  ) {
    return false
  }
  if (typeof process.getuid !== "function") return false

  try {
    const sessions = await executor.run("loginctl", [
      "show-user",
      String(process.getuid()),
      "--property=Sessions",
    ])
    if (sessions.exitCode !== 0) return false
    const sessionIds = sessionProperty(sessions.stdout, "Sessions")
      .split(" ")
      .filter((id) => id.length > 0)
    for (const sessionId of sessionIds) {
      const session = await executor.run("loginctl", [
        "show-session",
        sessionId,
        "--property=Active",
        "--property=Type",
        "--property=Desktop",
      ])
      if (session.exitCode !== 0) continue
      if (sessionProperty(session.stdout, "Active") !== "yes") continue
      if (sessionProperty(session.stdout, "Type") !== "wayland") continue
      if (
        isGnomeDesktop({
          XDG_CURRENT_DESKTOP: sessionProperty(session.stdout, "Desktop"),
        })
      )
        return true

      // Ubuntu's logind session can omit Desktop. systemd's user manager
      // retains the graphical session variables that the daemon inherits.
      const environment = await executor.run("systemctl", [
        "--user",
        "show-environment",
      ])
      if (
        environment.exitCode === 0 &&
        isGnomeDesktop({
          XDG_CURRENT_DESKTOP: sessionProperty(
            environment.stdout,
            "XDG_CURRENT_DESKTOP",
          ),
        })
      )
        return true
    }
  } catch {
    // No logind is available in some containers and non-Linux environments.
  }
  return false
}

interface ProbeResult {
  bus: LinuxDbusBus
  focusClass: () => Promise<string>
  focusTitle?: () => Promise<string>
}

const probeExtension = async (
  deps: WaylandGnomeDeps,
): Promise<ProbeResult | null> => {
  let bus: LinuxDbusBus | null = deps.dbus ?? null
  if (bus === null) {
    try {
      bus = (await sessionBus()) as unknown as LinuxDbusBus
    } catch (error) {
      deps.logger.warn(
        {
          error: serializeError(error),
          installUrl: EXTENSION_INSTALL_URL,
        },
        "active-app: GNOME session bus unavailable",
      )
      return null
    }
  }

  let proxy: LinuxDbusProxyObject
  try {
    proxy = await Promise.race([
      bus.getProxyObject(GNOME_SHELL_SERVICE, GNOME_EXTENSION_PATH),
      new Promise<never>((_resolve, reject) =>
        setTimeout(
          () => reject(new Error("extension probe timed out")),
          PROBE_TIMEOUT_MS,
        ),
      ),
    ])
  } catch (error) {
    deps.logger.warn(
      {
        error: serializeError(error),
        timeoutMs: PROBE_TIMEOUT_MS,
        installUrl: EXTENSION_INSTALL_URL,
      },
      "active-app: GNOME extension probe failed — install 'Window Calls Extended' to enable active-app detection on Wayland",
    )
    bus.disconnect?.()
    return null
  }

  const iface = proxy.getInterface(GNOME_EXTENSION_IFACE)
  const focusClass = iface.FocusClass
  if (typeof focusClass !== "function") {
    deps.logger.warn(
      { ifaceKeys: Object.keys(iface) },
      "active-app: GNOME extension reached but FocusClass method missing",
    )
    bus.disconnect?.()
    return null
  }

  const focusTitle =
    typeof iface.FocusTitle === "function"
      ? iface.FocusTitle.bind(iface)
      : undefined

  return {
    bus,
    focusClass: focusClass.bind(iface),
    ...(focusTitle ? { focusTitle } : {}),
  }
}

export const createWaylandGnomeProvider = async (
  deps: WaylandGnomeDeps,
): Promise<ActiveAppProvider> => {
  const probe = await probeExtension(deps)
  if (probe === null) {
    logNull(deps.logger, "active-app", "gnome-extension-missing")
    return {
      async getActive() {
        return null
      },
      subscribe() {
        return () => undefined
      },
      async stop() {
        return
      },
    }
  }

  const pollMs = deps.pollIntervalMs ?? DEFAULT_POLL_MS
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastName: string | null = null
  let lastTitle: string | null = null
  let consecutiveFailures = 0
  let stopped = false
  const subscribers = new Set<(s: ActiveAppSnapshot | null) => void>()

  const emit = (name: string | null, title: string | null): void => {
    if (name === lastName && title === lastTitle) return
    lastName = name
    lastTitle = title
    const snapshot: ActiveAppSnapshot | null =
      name === null ? null : { name, windowTitle: title, processId: null }
    for (const handler of subscribers) handler(snapshot)
  }

  const poll = async (): Promise<void> => {
    if (stopped) return
    try {
      const [rawClass, rawTitle] = await Promise.all([
        probe.focusClass(),
        probe.focusTitle ? probe.focusTitle() : Promise.resolve(""),
      ])
      consecutiveFailures = 0
      const name =
        typeof rawClass === "string" && rawClass.length > 0 ? rawClass : null
      const title =
        typeof rawTitle === "string" && rawTitle.length > 0 ? rawTitle : null
      emit(name, title)
    } catch (error) {
      consecutiveFailures += 1
      deps.logger.debug(
        { error: serializeError(error), consecutiveFailures },
        "active-app: wayland-gnome poll failed",
      )
      if (consecutiveFailures === MAX_CONSECUTIVE_POLL_FAILURES) {
        deps.logger.warn(
          {
            error: serializeError(error),
            maxFailures: MAX_CONSECUTIVE_POLL_FAILURES,
          },
          "active-app: wayland-gnome poll failed repeatedly — disabling poller",
        )
        stopped = true
        if (timer !== null) clearTimeout(timer)
        return
      }
    }
    if (!stopped) timer = setTimeout(() => void poll(), pollMs)
  }

  void poll()

  return {
    async getActive() {
      return lastName === null
        ? null
        : { name: lastName, windowTitle: lastTitle, processId: null }
    },
    subscribe(handler) {
      subscribers.add(handler)
      const snapshot: ActiveAppSnapshot | null =
        lastName === null
          ? null
          : { name: lastName, windowTitle: lastTitle, processId: null }
      handler(snapshot)
      return () => {
        subscribers.delete(handler)
      }
    },
    async stop() {
      stopped = true
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      probe.bus.disconnect?.()
    },
  }
}
