import type pino from "pino"

import { isRunning, readPid, removePidFile } from "../../util/daemon.js"

export interface StopOptions {
  logger: pino.Logger
}

export async function stopDaemon(options: StopOptions): Promise<void> {
  const { logger } = options
  const pid = readPid()

  if (pid === null) {
    logger.info("no running daemon found")
    return
  }

  if (!isRunning(pid)) {
    logger.warn({ pid }, "stale PID file found")
    removePidFile()
    return
  }

  logger.info({ pid }, "stopping daemon")
  process.kill(pid, "SIGTERM")

  let retries = 10
  while (retries > 0 && isRunning(pid)) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    retries -= 1
  }

  if (isRunning(pid)) {
    logger.warn({ pid }, "daemon did not respond to SIGTERM, sending SIGKILL")
    process.kill(pid, "SIGKILL")
  }

  logger.info("daemon stopped")
}
