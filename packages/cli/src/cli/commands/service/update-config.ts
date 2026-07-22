import { writeConfigPath, readConfigPath } from "@/util/daemon"
import { findConfigPath } from "@/config/discovery"
import type { CommandModule } from "yargs"
import { existsSync } from "node:fs"
import { join } from "node:path"

export interface UpdateConfigOptions {
  readonly config: string
  readonly homeDir?: string
  readonly xdgConfigHome?: string
  readonly logger: import("pino").Logger
}

export const updateConfig = async (
  options: UpdateConfigOptions,
): Promise<void> => {
  const { logger, config } = options
  const resolved = existsSync(config)
    ? config
    : join(
        options.xdgConfigHome ?? process.env["XDG_CONFIG_HOME"] ?? `${options.homeDir ?? process.env["HOME"] ?? ""}/.config`,
        "sireno-deck",
        config,
      )

  if (!existsSync(resolved)) {
    logger.error({ config: resolved }, "update-config: file not found")
    process.exitCode = 1
    return
  }

  const current = readConfigPath()
  writeConfigPath(resolved)
  logger.info({ config: resolved, previous: current }, "update-config: config path updated")
}

interface UpdateConfigArgs {
  config: string
}

export const updateConfigCommand: CommandModule<object, UpdateConfigArgs> = {
  command: "update-config",
  describe: "Update the config path the service uses",
  builder: (yargs) =>
    yargs.option("config", {
      type: "string",
      demandOption: true,
      description: "Path to config.yml",
    }),
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    await updateConfig({ config: argv.config, logger })
  },
}
