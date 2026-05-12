import type pino from "pino"

import { loadConfig } from "../../config/loader.js"
import { ConfigValidationError } from "../../core/schemas.js"
import { formatConfigError } from "../../util/errors.js"
import {
  isRunning,
  readPid,
  removePidFile,
  setupSignalHandlers,
  writePid,
} from "../../util/daemon.js"

export interface StartOptions {
  config?: string
  logger: pino.Logger
}

export async function startDaemon(options: StartOptions): Promise<void> {
  const { logger } = options
  const existingPid = readPid()

  if (existingPid !== null && isRunning(existingPid)) {
    logger.error({ pid: existingPid }, "daemon already running")
    process.exitCode = 1
    return
  }

  if (existingPid !== null) {
    logger.warn({ pid: existingPid }, "stale PID file found; removing it before start")
    removePidFile()
  }

  try {
    const config = loadConfig(options.config)
    logger.info({ config }, "config loaded successfully")
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      console.error(formatConfigError(error))
      process.exitCode = 1
      return
    }

    throw error
  }

  writePid()
  setupSignalHandlers(logger)

  logger.info({ pid: process.pid }, "sireno-deck daemon started")
  logger.info("press Ctrl+C to stop")

  await new Promise(() => {
    setInterval(() => {}, 1000)
  })
}
