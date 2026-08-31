import { execSync } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { currentOS, renderTemplate, type TemplateVars } from "./render-template"

export interface InstallOptions {
  readonly logger: import("pino").Logger
  readonly system?: boolean
}

const DAEMON_NAME = "sirenodeck"
const SERVICE_NAME = `${DAEMON_NAME}.service`

// ponytail: ExecStart calls `start` — no flags. The systemd-started process
// detects `INVOCATION_ID` and runs in-process, reading config + flags from
// runtimeDir. Keeps the unit stable; config changes don't require reinstall.
const getExecStart = (): string => {
  const binPath = process.argv[1] ?? `sirenodeck`
  return `${binPath} start`
}

const getTemplateVars = (): TemplateVars => {
  const home = homedir()
  return {
    name: DAEMON_NAME,
    displayName: "Sireno Deck",
    description: "Sireno Deck daemon service",
    execStart: getExecStart(),
    restartPolicy: "always",
    workingDirectory: home,
    logPath: join(home, "Library", "Logs", `${DAEMON_NAME}.log`),
  }
}

const ensureDir = (dir: string, mode: number): void => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode })
}

export const installService = async (
  options: InstallOptions,
): Promise<void> => {
  const { logger, system = false } = options
  const os = currentOS()
  const vars = getTemplateVars()
  const userLevel = !system

  if (os === "linux") {
    const unitDir = userLevel
      ? join(homedir(), ".config", "systemd", "user")
      : "/etc/systemd/system"
    const unitPath = join(unitDir, SERVICE_NAME)
    const content = renderTemplate(
      os,
      {
        ...vars,
        ...(userLevel ? {} : { user: "root", group: "root" }),
      },
      { userLevel },
    )

    try {
      if (userLevel) ensureDir(unitDir, 0o755)
      writeFileSync(unitPath, content, { mode: 0o644 })
      logger.info({ path: unitPath }, "install: systemd unit installed")

      const systemctl = userLevel ? "systemctl --user" : "systemctl"
      execSync(`${systemctl} daemon-reload`, { stdio: "ignore" })
      logger.info({ userLevel }, "install: systemd daemon reloaded")
      execSync(`${systemctl} enable ${SERVICE_NAME}`, { stdio: "ignore" })
      logger.info({ service: SERVICE_NAME, userLevel }, "install: enabled")
    } catch (err) {
      logger.error(
        { err, userLevel },
        userLevel
          ? "install: failed to install user-level systemd service"
          : "install: failed to install system systemd service (needs root)",
      )
      process.exitCode = 1
    }
  } else if (os === "darwin") {
    const plistDir = join(homedir(), "Library", "LaunchAgents")
    const plistPath = join(plistDir, `${DAEMON_NAME}.plist`)
    const logDir = join(homedir(), "Library", "Logs")
    try {
      ensureDir(plistDir, 0o755)
      ensureDir(logDir, 0o755)
      const content = renderTemplate(os, vars, { userLevel })
      writeFileSync(plistPath, content, { mode: 0o644 })
      logger.info({ path: plistPath }, "install: launchd plist installed")
      execSync(`launchctl load "${plistPath}"`, { stdio: "ignore" })
      logger.info({ service: SERVICE_NAME }, "install: loaded")
    } catch (err) {
      logger.error({ err }, "install: failed to install launchd service")
      process.exitCode = 1
    }
  } else {
    logger.error(
      "install: native service installation not supported on this platform",
    )
    process.exitCode = 1
  }
}
