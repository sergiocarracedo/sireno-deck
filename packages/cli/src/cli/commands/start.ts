import { existsSync } from "node:fs"
import { dirname, join, resolve as resolvePath } from "node:path"
import { fileURLToPath } from "node:url"

import { select } from "@inquirer/prompts"
import type pino from "pino"

import {
  generateToken,
  isRunning,
  readPid,
  readToken,
  removeChildrenFile,
  removePidFile,
  removeTokenFile,
  writeChildren,
  writePid,
  writeToken,
} from "@/util/daemon"

import { startHttpServer, type RunningHttpServer } from "../http-server"

import {
  preflight,
  runPipeline,
  type RunOptions,
  type SignalProvider,
} from "./run"

export interface StartOptions {
  readonly config?: string
  readonly port?: number
  readonly emulator?: boolean
  readonly deviceModel?: string
  readonly frontendUrl?: string
  readonly intervalMs?: number
  readonly xdgConfigHome?: string
  readonly homeDir?: string
  readonly httpPort?: number
  readonly signals?: SignalProvider
  readonly logger: pino.Logger
}

const toRunOptions = (
  options: StartOptions,
  onChildren: (pids: ReadonlyArray<number>) => void,
): RunOptions => ({
  logger: options.logger,
  config: options.config,
  port: options.port,
  emulator: options.emulator,
  deviceModel: options.deviceModel,
  frontendUrl: options.frontendUrl,
  intervalMs: options.intervalMs,
  xdgConfigHome: options.xdgConfigHome,
  homeDir: options.homeDir,
  signals: options.signals,
  onChildren,
})

const resolveFrontendDist = (): string => {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolvePath(here, "../../frontend/dist")
}

const promptConflict = async (pid: number): Promise<"restart" | "cancel"> => {
  if (!process.stdin.isTTY) {
    throw new Error(
      `Daemon already running with pid ${pid} (non-interactive: not stopping)`,
    )
  }
  const answer = await select({
    message: `Daemon already running with pid ${pid}.`,
    choices: [
      {
        name: "restart",
        value: "restart" as const,
        description: "Stop the existing daemon and start a new one",
      },
      {
        name: "cancel",
        value: "cancel" as const,
        description: "Exit without changes",
      },
    ],
  })
  return answer
}

const stopExisting = async (
  pid: number,
  logger: pino.Logger,
): Promise<void> => {
  if (!isRunning(pid)) {
    logger.warn({ pid }, "existing pid file is stale, removing")
    removePidFile()
    return
  }
  logger.info({ pid }, "stopping existing daemon")
  try {
    process.kill(pid, "SIGTERM")
  } catch (err) {
    logger.warn({ err, pid }, "failed to send SIGTERM to existing daemon")
  }
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline && isRunning(pid)) {
    await new Promise((r) => setTimeout(r, 100))
  }
  if (isRunning(pid)) {
    logger.warn({ pid }, "existing daemon did not exit in 5s, sending SIGKILL")
    try {
      process.kill(pid, "SIGKILL")
    } catch (err) {
      logger.warn({ err, pid }, "failed to send SIGKILL to existing daemon")
    }
  }
}

const start = async (options: StartOptions): Promise<void> => {
  const { logger } = options

  const existing = readPid()
  if (existing !== null && isRunning(existing)) {
    const action = await promptConflict(existing)
    if (action === "cancel") {
      logger.info("start cancelled")
      return
    }
    await stopExisting(existing, logger)
    removePidFile()
    removeTokenFile()
    removeChildrenFile()
  }

  const runOptions = toRunOptions(options, (pids) => {
    writeChildren({ pids: [...pids] })
    logger.info({ pids }, "daemon: tracked children")
  })

  await preflight(runOptions)

  writePid(process.pid)
  const token = generateToken()
  writeToken(token)
  logger.info(
    { pid: process.pid, tokenLen: token.length },
    "daemon: pid + token written",
  )

  let httpServer: RunningHttpServer | null = null
  const distDir = resolveFrontendDist()
  const indexPath = join(distDir, "index.html")
  if (existsSync(indexPath)) {
    try {
      httpServer = await startHttpServer({
        port: options.httpPort ?? 3939,
        distDir,
        getToken: () => readToken(),
        logger,
      })
    } catch (err) {
      logger.warn(
        { err },
        "daemon: failed to start http server, continuing without it",
      )
      httpServer = null
    }
  } else {
    logger.warn(
      { distDir },
      "daemon: frontend dist not found, skipping http server (run `pnpm build` first for the prod HTTP server)",
    )
  }

  void runPipeline(runOptions)
    .catch((err: unknown) => {
      logger.error({ err }, "background run failed")
    })
    .finally(async () => {
      if (httpServer !== null) {
        try {
          await httpServer.stop()
          logger.info("daemon: http server stopped")
        } catch (err) {
          logger.warn({ err }, "daemon: http server stop failed")
        }
      }
      removePidFile()
      removeTokenFile()
      removeChildrenFile()
      logger.info("daemon: shutdown complete")
    })
}

export default start
