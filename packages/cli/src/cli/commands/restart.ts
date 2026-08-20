import type pino from "pino"

import {
  isRunning,
  readFlags,
  readPid,
  resolveDaemonPaths,
} from "@/util/daemon"
import { tailLogs } from "@/util/log-tail"

import { ensureInstalled, invokeManager } from "./service-manager"
import start, { type StartOptions } from "./start"
import stop from "./stop"

export interface RestartOptions {
  readonly logger: pino.Logger
  readonly system?: boolean
  readonly logs?: boolean
}

const isDevInvocation = (): boolean => (process.argv[1] ?? "").endsWith(".ts")

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

// ponytail: dev mode forks the daemon via spawnDetached from the wrapper,
// not via systemctl/launchctl. invokeManager in dev would shell out to the
// OS service manager and either fail or no-op against a daemon it never
// started. Read the cached flags.json (written by startInBackground) and
// run the in-process stop + start pair instead.
const flagsToStartOptions = (
  flags: ReturnType<typeof readFlags>,
  logger: pino.Logger,
): StartOptions | null => {
  if (flags === null) return null
  return {
    logger,
    emulator: flags.emulator,
    ...(flags.remote === true ? { remote: true } : {}),
    ...(flags.deviceModel !== undefined
      ? { deviceModel: flags.deviceModel }
      : {}),
    ...(flags.port !== undefined ? { port: flags.port } : {}),
    httpPort: flags.httpPort,
  }
}

export const restart = async (options: RestartOptions): Promise<void> => {
  const { logger } = options

  if (isDevInvocation()) {
    const startOptions = flagsToStartOptions(readFlags(), logger)
    if (startOptions === null) {
      logger.warn(
        "restart: no cached flags.json — pass them on the command line (e.g. `pnpm dev restart --emulator`)",
      )
      return
    }
    await stop({ logger })
    await start(startOptions)
    const pid = await pollForPid(5_000)
    logger.info({ pid }, "restart: daemon restarted")
    if (options.logs === true && process.exitCode !== 1) {
      const logPath = `${resolveDaemonPaths().runtimeDir}/service.log`
      await tailLogs({ logPath, follow: true, lines: 50 })
    }
    return
  }

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

export default restart
