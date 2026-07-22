import {
  readPid,
  isRunning,
  removePidFile,
  removeTokenFile,
  removeChildrenFile,
} from "@/util/daemon"
import { terminateChildren } from "@/util/daemon"
import type { CommandModule } from "yargs"

export interface StopOptions {
  readonly logger: import("pino").Logger
}

export const stopService = async (options: StopOptions): Promise<void> => {
  const { logger } = options
  const pid = readPid()
  if (pid === null) {
    logger.info("stop: no daemon running")
    return
  }
  if (!isRunning(pid)) {
    logger.warn({ pid }, "stop: stale pid file, cleaning up")
    removePidFile()
    removeTokenFile()
    removeChildrenFile()
    return
  }
  logger.info({ pid }, "stop: terminating daemon")
  try {
    process.kill(pid, "SIGTERM")
  } catch (err) {
    logger.warn({ err, pid }, "stop: failed to send SIGTERM")
  }
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline && isRunning(pid)) {
    await new Promise((r) => setTimeout(r, 100))
  }
  if (isRunning(pid)) {
    logger.warn({ pid }, "stop: daemon did not exit, sending SIGKILL")
    try {
      process.kill(pid, "SIGKILL")
    } catch (err) {
      logger.warn({ err, pid }, "stop: failed to send SIGKILL")
    }
  }
  await terminateChildren({ logger, timeoutMs: 3_000 })
  removePidFile()
  removeTokenFile()
  removeChildrenFile()
  logger.info("stop: daemon stopped")
}

interface ServiceStopArgs {}

export const stopCommand: CommandModule<object, ServiceStopArgs> = {
  command: "stop",
  describe: "Stop the sireno-deck service",
  handler: async (argv) => {
    const { createLogger } = await import("@/util/logger")
    const logger = createLogger({ verbose: false })
    await stopService({ logger })
  },
}
