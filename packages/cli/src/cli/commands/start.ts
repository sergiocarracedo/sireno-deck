import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve as resolvePath } from "node:path"
import { fileURLToPath } from "node:url"

import { select } from "@inquirer/prompts"
import type pino from "pino"

import { findConfigPath } from "@/config/discovery"
import {
  generateToken,
  isRunning,
  pruneStaleChildren,
  readConfigPath,
  readFlags,
  readPid,
  readToken,
  removeChildrenFile,
  removePidFile,
  removeTokenFile,
  resolveDaemonPaths,
  terminateChildren,
  writeChildren,
  writeConfigPath,
  writeFlags,
  writePid,
  writeToken,
  type RuntimeFlags,
} from "@/util/daemon"

import { startHttpServer, type RunningHttpServer } from "../http-server"
import { tailLogs } from "@/util/log-tail"
import {
  builtinDir,
  collectBuiltinAddonRegistry,
  type ScannedAddon,
} from "./addon-registry"
import { ensureInstalled, invokeManager } from "./service-manager"
import { isUnderServiceManager, spawnDetached } from "./spawn-daemon"
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
  readonly logs?: boolean
  readonly system?: boolean
  readonly signals?: SignalProvider
  readonly logger: pino.Logger
}

const toRunOptions = (
  options: StartOptions,
  onChildren: (pids: ReadonlyArray<number>) => void,
  onAddonsUpdate?: (addons: ReadonlyArray<ScannedAddon>) => void,
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
  onAddonsUpdate,
})

const resolveFrontendDist = (): string => {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolvePath(here, "../../../frontend/dist")
}

const resolveBinPath = (): string => {
  return process.argv[1] ?? process.execPath
}

const isDevInvocation = (): boolean => {
  return (process.argv[1] ?? "").endsWith(".ts")
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
    await terminateChildren({ logger, timeoutMs: 2_000 })
    removeChildrenFile()
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
  await terminateChildren({ logger, timeoutMs: 2_000 })
  removePidFile()
  removeTokenFile()
  removeChildrenFile()
}

const resolveConfigPath = (options: StartOptions): string => {
  const home = options.homeDir ?? process.env["HOME"] ?? ""
  const xdgConfigHome =
    options.xdgConfigHome ?? process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`
  return (
    options.config ??
    readConfigPath() ??
    findConfigPath({
      homeDir: home,
      ...(options.xdgConfigHome !== undefined
        ? { xdgConfigHome: options.xdgConfigHome }
        : {}),
    }) ??
    join(xdgConfigHome, "sireno-deck", "config.yml")
  )
}

const buildRuntimeFlags = (options: StartOptions): RuntimeFlags => ({
  emulator: options.emulator === true,
  httpPort: options.httpPort ?? 3939,
  ...(options.deviceModel !== undefined
    ? { deviceModel: options.deviceModel }
    : {}),
  ...(options.port !== undefined ? { port: options.port } : {}),
})

const runInProcess = async (options: StartOptions): Promise<void> => {
  const { logger } = options

  const home = options.homeDir ?? process.env["HOME"] ?? ""
  const xdgConfigHome =
    options.xdgConfigHome ?? process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`
  const configPath = resolveConfigPath(options)
  const runtimeFlags = readFlags() ?? buildRuntimeFlags(options)
  writeConfigPath(configPath)
  writeFlags(runtimeFlags)

  const builtinAddons = (await collectBuiltinAddonRegistry()).scanned
  const allScanned: ScannedAddon[] = [...builtinAddons]

  const runOptions = toRunOptions(
    {
      ...options,
      config: configPath,
      port: runtimeFlags.port,
      emulator: runtimeFlags.emulator,
      deviceModel: runtimeFlags.deviceModel,
      httpPort: runtimeFlags.httpPort,
    },
    (pids) => {
      writeChildren({ pids: [...pids] })
      logger.info({ pids }, "daemon: tracked children")
    },
    (addons) => {
      allScanned.length = 0
      allScanned.push(...addons)
    },
  )

  await preflight(runOptions)

  writePid(process.pid)
  const token = generateToken()
  writeToken(token)
  logger.info({ tokenLen: token.length }, "daemon: pid + token written")

  let httpServer: RunningHttpServer | null = null
  const distDir = resolveFrontendDist()
  const indexPath = join(distDir, "index.html")
  if (existsSync(indexPath)) {
    try {
      httpServer = await startHttpServer({
        port: runtimeFlags.httpPort,
        distDir,
        getToken: () => readToken(),
        logger,
        getConfigContent: () => {
          try {
            return readFileSync(configPath, "utf8")
          } catch {
            return null
          }
        },
        getConfigPath: () => configPath,
        getAddons: () =>
          allScanned.map((s) => ({
            name: s.name,
            path: s.path ?? join(builtinDir, s.name),
            internal: s.internal,
            source: s.source,
            buttonTypes: Object.entries(s.buttonTypes).map(([type, info]) => ({
              type,
              internal: info.internal,
            })),
            defaultButton: null,
            decks: [...s.decks],
          })),
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
      // ponytail: explicit exit — without this, lingering handles in the
      // emulator's active-app polling or lingering ws-bridge connections keep
      // the event loop alive and the daemon process never terminates after
      // a startup failure. The systemd / fork-off flows don't go through
      // runInProcess, so this only affects the in-process daemon path.
      process.exit(process.exitCode ?? 0)
    })
}

const forkOffDev = async (options: StartOptions): Promise<void> => {
  const { logger } = options
  const configPath = resolveConfigPath(options)
  const runtimeFlags = buildRuntimeFlags(options)
  writeConfigPath(configPath)
  writeFlags(runtimeFlags)
  pruneStaleChildren(undefined, logger)
  await terminateChildren({ logger, timeoutMs: 2_000 })

  const binPath = resolveBinPath()
  const args: string[] = ["start"]
  // ponytail: devMode true makes spawnDetached pipe stdout/stderr through a
  // tee — each ndjson line is appended to runtimeDir/service.log AND emitted
  // formatted to the parent's terminal. Without this, `pnpm dev start
  // --emulator` shows "daemon spawned" and then goes silent until the
  // operator kills it.
  const { pid, child } = spawnDetached({ binPath, args, devMode: true })
  if (pid <= 0) {
    throw new Error("start: failed to spawn daemon (no pid returned)")
  }
  writePid(pid)
  logger.info({ childPid: pid, configPath }, "start: daemon spawned (dev)")
  // ponytail: in dev mode the daemon IS the user's working surface — don't
  // bail out on the grace window. Keep the parent hooked to the child's
  // stdio until the child exits naturally (or the user hits Ctrl+C).
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve())
    process.once("SIGINT", () => {
      try {
        process.kill(pid, "SIGTERM")
      } catch {
        // already gone
      }
      resolve()
    })
  })
}

const startProduction = async (options: StartOptions): Promise<void> => {
  const { logger } = options
  const configPath = resolveConfigPath(options)
  const runtimeFlags = buildRuntimeFlags(options)
  writeConfigPath(configPath)
  writeFlags(runtimeFlags)

  await ensureInstalled({
    logger,
    ...(options.system === true ? { system: true } : {}),
  })
  await invokeManager({ action: "restart", logger })

  const paths = resolveDaemonPaths()
  const deadline = Date.now() + 5_000
  let pid: number | null = null
  while (Date.now() < deadline) {
    pid = readPid(paths)
    if (pid !== null && isRunning(pid)) break
    await new Promise((r) => setTimeout(r, 100))
  }
  logger.info(
    { childPid: pid, configPath },
    pid !== null
      ? "start: daemon started via service manager"
      : "start: daemon started (pid not yet visible)",
  )

  if (options.logs === true && process.exitCode !== 1) {
    const logPath = `${paths.runtimeDir}/service.log`
    await tailLogs({ logPath, follow: true, lines: 50 })
  }
}

const start = async (options: StartOptions): Promise<void> => {
  const { logger } = options

  if (isUnderServiceManager()) {
    await runInProcess(options)
    return
  }

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
  } else if (existing !== null) {
    removePidFile()
    removeTokenFile()
    removeChildrenFile()
    pruneStaleChildren(undefined, logger)
  }

  if (isDevInvocation()) {
    await forkOffDev(options)
  } else {
    await startProduction(options)
  }
}

export default start
