import type pino from "pino"

import { isRunning, readPid, removePidFile } from "@/util/daemon"

export interface StatusOptions {
  logger: pino.Logger
}

export async function checkStatus(options: StatusOptions): Promise<void> {
  const { logger } = options
  const pid = readPid()

  if (pid === null) {
    logger.info("daemon is not running")
    return
  }

  if (isRunning(pid)) {
    logger.info({ pid }, "daemon is running")
    return
  }

  logger.warn({ pid }, "stale PID file found")
  removePidFile()
}
