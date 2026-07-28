import type pino from "pino"

import { readPid, isRunning, resolveDaemonPaths } from "@/util/daemon"
import { tailLogs } from "@/util/log-tail"

export interface ReloadOptions {
  readonly logger: pino.Logger
  readonly logs?: boolean
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
    return
  }

  if (options.logs === true && process.exitCode !== 1) {
    const logPath = `${resolveDaemonPaths().runtimeDir}/service.log`
    await tailLogs({ logPath, follow: true, lines: 50 })
  }
}
