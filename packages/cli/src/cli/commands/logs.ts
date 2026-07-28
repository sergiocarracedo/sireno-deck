import { existsSync } from "node:fs"
import type { CommandModule } from "yargs"

import type { Logger } from "pino"

import { resolveDaemonPaths } from "@/util/daemon"
import { tailLogs } from "@/util/log-tail"

export interface LogsOptions {
  readonly follow?: boolean
  readonly lines?: number
  readonly logger: Logger
}

export const logs = async (options: LogsOptions): Promise<void> => {
  const { logger, follow = true, lines = 50 } = options
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
  await tailLogs({ logPath, follow, lines })
}

interface LogsArgs {
  follow?: boolean
  lines?: number
}

export const logsCommand: CommandModule<object, LogsArgs> = {
  command: "logs",
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
      }),
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    await logs({
      logger,
      follow: argv.follow !== false,
      ...(argv.lines !== undefined ? { lines: argv.lines } : {}),
    })
  },
}
