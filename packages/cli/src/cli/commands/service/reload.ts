import { readPid, isRunning } from "@/util/daemon"
import type { CommandModule } from "yargs"

export interface ReloadOptions {
  readonly logger: import("pino").Logger
}

export const reload = async (options: ReloadOptions): Promise<void> => {
  const { logger } = options
  const pid = readPid()
  if (pid === null) {
    logger.error("reload: no daemon running")
    process.exitCode = 1
    return
  }
  if (!isRunning(pid)) {
    logger.error({ pid }, "reload: daemon not running")
    process.exitCode = 1
    return
  }
  try {
    process.kill(pid, "SIGUSR1")
    logger.info({ pid }, "reload: sent SIGUSR1 to daemon")
  } catch (err) {
    logger.error({ err, pid }, "reload: failed to send signal")
    process.exitCode = 1
  }
}

interface ServiceReloadArgs {}

export const reloadCommand: CommandModule<object, ServiceReloadArgs> = {
  command: "reload",
  describe: "Send SIGUSR1 to the daemon to reload its configuration",
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    await reload({ logger })
  },
}
