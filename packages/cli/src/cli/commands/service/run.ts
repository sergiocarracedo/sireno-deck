import { readConfigPath } from "@/util/daemon"
import { findConfigPath } from "@/config/discovery"
import type { CommandModule } from "yargs"
import { existsSync } from "node:fs"
import { join } from "node:path"

export interface ServiceRunOptions {
  readonly config?: string
  readonly port?: number
  readonly emulator?: boolean
  readonly deviceModel?: string
  readonly httpPort?: number
  readonly homeDir?: string
  readonly xdgConfigHome?: string
  readonly logger: import("pino").Logger
}

export const serviceRun = async (
  options: ServiceRunOptions,
): Promise<void> => {
  const { logger } = options
  const start = (await import("../start")).default
  const home = options.homeDir ?? process.env["HOME"] ?? ""
  const xdgConfigHome =
    options.xdgConfigHome ?? process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`
  const configPath =
    options.config ??
    readConfigPath() ??
    findConfigPath({ homeDir: home, xdgConfigHome }) ??
    join(xdgConfigHome, "sireno-deck", "config.yml")

  if (!existsSync(configPath)) {
    logger.error({ configPath }, "config file not found")
    process.exitCode = 1
    return
  }

  await start({
    logger,
    config: configPath,
    port: options.port,
    emulator: options.emulator,
    deviceModel: options.deviceModel,
    httpPort: options.httpPort,
    homeDir: options.homeDir,
    xdgConfigHome: options.xdgConfigHome,

  })
}

interface ServiceRunArgs {
  config?: string
  port?: number
  emulator?: boolean
  deviceModel?: string
  httpPort?: number
}

export const serviceRunCommand: CommandModule<object, ServiceRunArgs> = {
  command: "run",
  describe: "Run the sireno-deck service in the foreground (service mode)",
  builder: (yargs) =>
    yargs
      .option("config", { type: "string", description: "Path to config.yml" })
      .option("port", { type: "number", description: "Server port" })
      .option("emulator", { type: "boolean", default: false })
      .option("device-model", { type: "string" })
      .option("http-port", { type: "number", default: 3939 }),
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    await serviceRun({
      logger,
      ...(argv.config !== undefined ? { config: argv.config } : {}),
      ...(argv.port !== undefined ? { port: argv.port } : {}),
      ...(argv.emulator !== undefined ? { emulator: argv.emulator } : {}),
      ...(argv.deviceModel !== undefined ? { deviceModel: argv.deviceModel } : {}),
      ...(argv.httpPort !== undefined ? { httpPort: argv.httpPort } : {}),
    })
  },
}
