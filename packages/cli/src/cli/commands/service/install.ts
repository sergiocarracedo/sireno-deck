import { execSync } from "node:child_process"
import { homedir } from "node:os"
import { writeFileSync, chmodSync, existsSync } from "node:fs"
import { join } from "node:path"
import type { CommandModule } from "yargs"
import { currentOS, renderTemplate, type TemplateVars } from "./render-template"
import { readConfigPath } from "@/util/daemon"
import { findConfigPath } from "@/config/discovery"
import { join as joinPath } from "node:path"

export interface InstallOptions {
  readonly logger: import("pino").Logger
}

const DAEMON_NAME = "sireno-deck"
const SERVICE_NAME = `${DAEMON_NAME}.service`

const getExecStart = (): string => {
  const binPath = process.argv[1] ?? `sireno-deck`
  const configArg = readConfigPath() ?? ""
  return `${binPath} service run ${configArg ? `--config ${configArg}` : ""}`
}

const getTemplateVars = (): TemplateVars => {
  const user = homedir()
  const userName = user.split("/").pop() ?? "sireno"
  const home = homedir()
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`
  const defaultConfig =
    findConfigPath({ homeDir: home, xdgConfigHome }) ??
    joinPath(xdgConfigHome, "sireno-deck", "config.yml")

  return {
    name: DAEMON_NAME,
    displayName: "Sireno Deck",
    description: "Sireno Deck daemon service",
    execStart: getExecStart(),
    restartPolicy: "always",
    workingDirectory: home,
    user: userName,
    group: userName,
  }
}

export const installService = async (
  options: InstallOptions,
): Promise<void> => {
  const { logger } = options
  const os = currentOS()
  const vars = getTemplateVars()
  const content = renderTemplate(os, vars)

  if (os === "linux") {
    const unitPath = `/etc/systemd/system/${SERVICE_NAME}`
    try {
      writeFileSync(unitPath, content, { mode: 0o644 })
      logger.info({ path: unitPath }, "install: systemd unit installed")
      execSync("systemctl daemon-reload", { stdio: "ignore" })
      logger.info("install: systemd daemon reloaded")
      execSync(`systemctl enable ${SERVICE_NAME}`, { stdio: "ignore" })
      logger.info(`install: ${SERVICE_NAME} enabled`)
    } catch (err) {
      logger.error(
        { err },
        "install: failed to install systemd service (needs root)",
      )
      process.exitCode = 1
    }
  } else if (os === "darwin") {
    const plistDir = join(homedir(), "Library", "LaunchAgents")
    const plistPath = join(plistDir, `${DAEMON_NAME}.plist`)
    try {
      if (!existsSync(plistDir)) {
        execSync(`mkdir -p "${plistDir}"`, { stdio: "ignore" })
      }
      writeFileSync(plistPath, content, { mode: 0o644 })
      logger.info({ path: plistPath }, "install: launchd plist installed")
      execSync(`launchctl load "${plistPath}"`, { stdio: "ignore" })
      logger.info(`install: ${SERVICE_NAME} loaded`)
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

interface ServiceInstallArgs {}

export const installCommand: CommandModule<object, ServiceInstallArgs> = {
  command: "install",
  describe: "Install sireno-deck as a native system service (systemd/launchd)",
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    await installService({ logger })
  },
}
