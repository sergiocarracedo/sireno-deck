import { stopService } from "./stop"
import { serviceRun } from "./run"
import { createLogger } from "@/util/logger"
import { readConfigPath } from "@/util/daemon"
import { findConfigPath } from "@/config/discovery"
import { join } from "node:path"
import { existsSync } from "node:fs"
import type { CommandModule } from "yargs"

export interface RestartOptions {
  readonly logger: import("pino").Logger
}

export const restart = async (options: RestartOptions): Promise<void> => {
  const { logger } = options
  logger.info("restart: stopping service")
  await stopService({ logger })
  logger.info("restart: starting service")

  const home = process.env["HOME"] ?? ""
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`
  const configPath =
    readConfigPath() ??
    findConfigPath({ homeDir: home, xdgConfigHome }) ??
    join(xdgConfigHome, "sireno-deck", "config.yml")

  if (!existsSync(configPath)) {
    logger.error({ configPath }, "restart: config file not found")
    process.exitCode = 1
    return
  }

  await serviceRun({ logger, config: configPath })
}

interface ServiceRestartArgs {}

export const restartCommand: CommandModule<object, ServiceRestartArgs> = {
  command: "restart",
  describe: "Restart the sireno-deck service",
  handler: async (argv) => {
    const logger = createLogger({ verbose: false })
    await restart({ logger })
  },
}
