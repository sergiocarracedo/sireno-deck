import { existsSync } from "node:fs"
import type { CommandModule } from "yargs"

import type { Logger } from "pino"

import { resolveDaemonPaths } from "@/util/daemon"
import { tailLogs } from "@/util/log-tail"

export interface LogsOptions {
  readonly follow?: boolean
  readonly lines?: number
  readonly timestamps?: boolean
  readonly logger: Logger
}

export const logs = async (options: LogsOptions): Promise<void> => {
  const { logger, follow = true, lines = 50, timestamps = true } = options
  const paths = resolveDaemonPaths()
  const logPath = `${paths.runtimeDir}/service.log`

  if (!existsSync(logPath)) {
    logger.error(
      { logPath },
      "logs: file does not exist (is the daemon running?)",
    )
    process.exitCode = 1
    return
  }

  logger.info({ logPath, follow, lines }, "logs: tailing")
  await tailLogs({ logPath, follow, lines, timestamps })
}

interface LogsArgs {
  follow?: boolean
  lines?: number
  timestamps?: boolean
}

export const logsCommand: CommandModule<object, LogsArgs> = {
  command: "logs",
  aliases: ["log"],
  describe: "Tail the daemon service log (Ctrl+C to exit)",
  builder: (yargs) =>
    yargs
      .option("follow", {
        alias: "f",
        type: "boolean",
        default: true,
        description: "Follow log output (default: true)",
      })
      .option("lines", {
        alias: "n",
        type: "number",
        default: 50,
        description: "Initial lines to print when following",
      })
      .option("timestamps", {
        alias: "t",
        type: "boolean",
        default: true,
        description: "Show when each entry was logged",
      }),
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    await logs({
      logger,
      follow: argv.follow !== false,
      timestamps: argv.timestamps !== false,
      ...(argv.lines !== undefined ? { lines: argv.lines } : {}),
    })
  },
}
