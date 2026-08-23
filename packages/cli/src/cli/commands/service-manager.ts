import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { platform } from "node:process"

import type { Logger } from "pino"

export type ServiceAction = "start" | "stop" | "restart" | "reload"

export interface EnsureInstalledOptions {
  readonly logger: Logger
  readonly system?: boolean
}

export interface InvokeManagerOptions {
  readonly action: ServiceAction
  readonly logger: Logger
}

const DAEMON_NAME = "sireno-deck"

const systemctl = (userLevel: boolean, args: ReadonlyArray<string>): void => {
  const cmd = userLevel ? "systemctl" : "systemctl"
  const fullArgs = userLevel ? ["--user", ...args] : [...args]
  execFileSync(cmd, fullArgs, { stdio: "ignore" })
}

const launchctl = (sub: string, args: ReadonlyArray<string>): void => {
  execFileSync("launchctl", [sub, ...args], { stdio: "ignore" })
}

const currentOS = (): "linux" | "darwin" | "win32" => {
  if (platform === "darwin") return "darwin"
  if (platform === "win32") return "win32"
  return "linux"
}

export const isUnitInstalled = (userLevel = true): boolean => {
  const os = currentOS()
  if (os === "linux") {
    const unitPath = userLevel
      ? join(homedir(), ".config", "systemd", "user", `${DAEMON_NAME}.service`)
      : `/etc/systemd/system/${DAEMON_NAME}.service`
    return existsSync(unitPath)
  }
  if (os === "darwin") {
    return existsSync(
      join(homedir(), "Library", "LaunchAgents", `${DAEMON_NAME}.plist`),
    )
  }
  return false
}

export const ensureInstalled = async (
  options: EnsureInstalledOptions,
): Promise<void> => {
  const { logger, system = false } = options
  const userLevel = !system
  if (isUnitInstalled(userLevel)) {
    logger.debug({ userLevel }, "ensureInstalled: unit already present")
    return
  }
  const { installService } = await import("./service/install")
  await installService({ logger, system })
}

export const invokeManager = async (
  options: InvokeManagerOptions,
): Promise<void> => {
  const { logger, action } = options
  const os = currentOS()

  if (os === "linux") {
    const verb = action === "reload" ? "reload-or-restart" : action
    systemctl(true, [verb, `${DAEMON_NAME}.service`])
    logger.info(
      { action, userLevel: true },
      "ensureInstalled: invoked systemctl",
    )
    return
  }
  if (os === "darwin") {
    const plist = join(
      homedir(),
      "Library",
      "LaunchAgents",
      `${DAEMON_NAME}.plist`,
    )
    const uid = String(process.getuid?.() ?? 0)
    if (action === "start") {
      launchctl("bootstrap", [`gui/${uid}`, plist])
      launchctl("enable", [`gui/${uid}/${DAEMON_NAME}`])
      launchctl("kickstart", [`gui/${uid}/${DAEMON_NAME}`])
    } else if (action === "stop") {
      launchctl("bootout", [`gui/${uid}/${DAEMON_NAME}`])
    } else if (action === "restart") {
      try {
        launchctl("bootout", [`gui/${uid}/${DAEMON_NAME}`])
      } catch {
        // not bootstrapped — ignore
      }
      launchctl("bootstrap", [`gui/${uid}`, plist])
      launchctl("kickstart", [`gui/${uid}/${DAEMON_NAME}`])
    } else {
      launchctl("kill", ["-SIGUSR1", `gui/${uid}/${DAEMON_NAME}`])
    }
    logger.info({ action }, "ensureInstalled: invoked launchctl")
    return
  }
  logger.error(
    { os, action },
    "ensureInstalled: native service management not supported on this platform",
  )
  process.exitCode = 1
}
