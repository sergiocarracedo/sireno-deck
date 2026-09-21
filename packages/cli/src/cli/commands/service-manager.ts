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

const DAEMON_NAME = "sirenodeck"

const systemctl = (userLevel: boolean, args: ReadonlyArray<string>): void => {
  const cmd = userLevel ? "systemctl" : "systemctl"
  const fullArgs = userLevel ? ["--user", ...args] : [...args]
  execFileSync(cmd, fullArgs, { stdio: "ignore" })
}

const launchctl = (sub: string, args: ReadonlyArray<string>): void => {
  execFileSync("launchctl", [sub, ...args], { stdio: "ignore" })
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Is launchd still holding this job? `print` fails for a label it does not
 * know, which is the only reliable "is it gone yet" signal available.
 */
const isJobLoaded = (uid: string, label: string): boolean => {
  try {
    execFileSync("launchctl", ["print", `gui/${uid}/${label}`], {
      stdio: "ignore",
      timeout: 5_000,
    })
    return true
  } catch {
    return false
  }
}

/**
 * ponytail: `launchctl bootout` returns before launchd has finished tearing
 * the job down. Bootstrapping straight afterwards fails with a bare I/O error,
 * and because that threw out of `invokeManager`, a restart could end with the
 * agent booted out and never brought back — no daemon at all, which is a worse
 * place than it started. Wait for the label to actually disappear, then
 * bootstrap, retrying while launchd settles. If the job turns out to be loaded
 * already, a kickstart is the right move rather than another bootstrap.
 */
const bootstrapWithRetry = async (
  uid: string,
  plist: string,
  label: string,
  timeoutMs = 15_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown = null
  while (Date.now() < deadline) {
    if (isJobLoaded(uid, label)) {
      try {
        launchctl("enable", [`gui/${uid}/${label}`])
      } catch {
        // already enabled
      }
      launchctl("kickstart", [`gui/${uid}/${label}`])
      return
    }
    try {
      launchctl("bootstrap", [`gui/${uid}`, plist])
      try {
        launchctl("enable", [`gui/${uid}/${label}`])
      } catch {
        // already enabled
      }
      launchctl("kickstart", [`gui/${uid}/${label}`])
      return
    } catch (err) {
      lastError = err
      await sleep(300)
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`launchctl: could not bootstrap ${label} within ${timeoutMs}ms`)
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
      // Same settling problem as restart: bootstrapping a label launchd is
      // still holding throws, so go through the retry.
      await bootstrapWithRetry(uid, plist, DAEMON_NAME)
    } else if (action === "stop") {
      launchctl("bootout", [`gui/${uid}/${DAEMON_NAME}`])
    } else if (action === "restart") {
      try {
        launchctl("bootout", [`gui/${uid}/${DAEMON_NAME}`])
      } catch {
        // not bootstrapped — ignore
      }
      const goneBy = Date.now() + 10_000
      while (Date.now() < goneBy && isJobLoaded(uid, DAEMON_NAME)) {
        await sleep(200)
      }
      await bootstrapWithRetry(uid, plist, DAEMON_NAME)
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
