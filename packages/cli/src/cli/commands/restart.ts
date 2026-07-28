import type pino from "pino"

import { isRunning, readPid, resolveDaemonPaths } from "@/util/daemon"
import { tailLogs } from "@/util/log-tail"

import { ensureInstalled, invokeManager } from "./service-manager"

export interface RestartOptions {
  readonly logger: pino.Logger
  readonly system?: boolean
  readonly logs?: boolean
}

const pollForPid = async (timeoutMs: number): Promise<number | null> => {
  const paths = resolveDaemonPaths()
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const pid = readPid(paths)
    if (pid !== null && isRunning(pid)) return pid
    await new Promise((r) => setTimeout(r, 100))
  }
  return readPid(paths)
}

export const restart = async (options: RestartOptions): Promise<void> => {
  const { logger } = options
  await ensureInstalled({
    logger,
    ...(options.system === true ? { system: true } : {}),
  })
  await invokeManager({ action: "restart", logger })
  const pid = await pollForPid(5_000)
  logger.info({ pid }, "restart: daemon restarted")

  if (options.logs === true && process.exitCode !== 1) {
    const logPath = `${resolveDaemonPaths().runtimeDir}/service.log`
    await tailLogs({ logPath, follow: true, lines: 50 })
  }
}
