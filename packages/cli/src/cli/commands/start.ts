import { existsSync, readFileSync, readdirSync, readlinkSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { dirname, join, resolve as resolvePath } from "node:path"
import { fileURLToPath } from "node:url"

import { confirm, select } from "@/cli/prompt"
import type pino from "pino"

import {
  cmdlineMentionsCliRoot,
  isOrphan,
  isOurViteChild,
  readProcCmdline,
} from "./port-identity"

import { resolveConfigPath as resolveRunConfigPath } from "./pipeline/helpers"
import type { ResolveConfigPathResult } from "./pipeline/helpers"
import {
  acquireStartLock,
  generateSentinel,
  generateToken,
  isRunning,
  pruneStaleChildren,
  readConfigPath,
  readFlags,
  readPid,
  readToken,
  removeChildrenFile,
  removePidFile,
  removeRuntimeStateFile,
  removeStartLock,
  removeTokenFile,
  resolveDaemonPaths,
  SENTINEL_ENV_VAR,
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
import { runPipeline, type RunOptions, type SignalProvider } from "./run"
import { preflight } from "./pipeline/preflight"
import {
  type SystemReport,
  probeAllCached,
  summarizeReport,
} from "@/system/setup-wizard"
import { systemRequirements } from "./system-requirements"
import { buildStandardProbeDeps } from "@/cli/probe-deps"

export interface StartOptions {
  readonly config?: string
  readonly port?: number
  readonly emulator?: boolean
  readonly remote?: boolean
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
  remote: options.remote,
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

const isDevInvocation = (): boolean => {
  return (process.argv[1] ?? "").endsWith(".ts")
}

// ponytail: kill every process currently listening on the daemon's expected
// ports — but ONLY if the identity gate (cmdline + orphan check) says it's
// ours. Otherwise the port collision stays and the new daemon's preflight
// surfaces a clear EADDRINUSE, which is the correct signal to the user.
const trySs = (port: number): ReadonlyArray<number> => {
  const ssLineRegex = (p: number): RegExp =>
    new RegExp(`:${p}\\b[\\s\\S]*?users:\\([^)]*?pid=(\\d+)[,\\)]`)
  try {
    const out = execFileSync("ss", ["-ltnp"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    const pids: number[] = []
    for (const line of out.split("\n")) {
      const m = line.match(ssLineRegex(port))
      if (m && m[1]) pids.push(Number.parseInt(m[1], 10))
    }
    return pids
  } catch {
    return []
  }
}

const tryLsof = (port: number): ReadonlyArray<number> => {
  try {
    const out = execFileSync("lsof", [`-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return out
      .split("\n")
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

const tryProcNet = (port: number): ReadonlyArray<number> => {
  if (process.platform !== "linux") return []
  try {
    const hex = port.toString(16).toUpperCase().padStart(4, "0")
    const out = readFileSync("/proc/net/tcp", "utf8")
    const pids = new Set<number>()
    const inodes: string[] = []
    for (const line of out.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/)
      if (cols.length < 10) continue
      const localAddr = cols[1] ?? ""
      const [, localPortHex] = localAddr.split(":")
      if (localPortHex !== hex) continue
      const inode = cols[9]
      if (inode) inodes.push(inode)
    }
    const procDirs = readdirSyncSync("/proc")
    for (const pidStr of procDirs) {
      if (!/^\d+$/.test(pidStr)) continue
      try {
        const fdList = readdirSyncSync(`/proc/${pidStr}/fd`)
        for (const fd of fdList) {
          try {
            const link = readlinkSyncFn(`/proc/${pidStr}/fd/${fd}`)
            for (const inode of inodes) {
              if (link === `socket:[${inode}]`) {
                pids.add(Number.parseInt(pidStr, 10))
              }
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
    return Array.from(pids)
  } catch {
    return []
  }
}

const readdirSyncSync = (dir: string): string[] => {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

const readlinkSyncFn = (path: string): string | null => {
  try {
    return readlinkSync(path)
  } catch {
    return null
  }
}

const detectPortPids = (
  port: number,
  logger: pino.Logger,
): ReadonlyArray<number> => {
  const ss = trySs(port)
  if (ss.length > 0) return ss
  const lsof = tryLsof(port)
  if (lsof.length > 0) {
    logger.debug({ port }, "port detection: ss failed, used lsof")
    return lsof
  }
  const procNet = tryProcNet(port)
  if (procNet.length > 0) {
    logger.debug({ port }, "port detection: ss/lsof failed, used /proc/net/tcp")
    return procNet
  }
  logger.warn(
    { port },
    "port detection: all backends failed (ss, lsof, /proc/net/tcp) — orphan cleanup may miss stale vites",
  )
  return []
}

const killPortListeners = async (
  ports: ReadonlyArray<number>,
  logger: pino.Logger,
): Promise<void> => {
  const daemonPid = readPid()
  for (const port of ports) {
    const pids = new Set(detectPortPids(port, logger))
    for (const pid of pids) {
      if (!isOurViteChild(pid)) {
        logger.warn(
          { pid, port },
          "start: port in use by a process that is NOT a sireno-deck child — leaving it alone",
        )
        continue
      }
      if (!cmdlineMentionsCliRoot(readProcCmdline(pid) ?? "")) {
        logger.warn(
          { pid, port },
          "start: port in use by a vite, but not under packages/cli/ — leaving it alone",
        )
        continue
      }
      if (!isOrphan(pid, daemonPid)) {
        logger.warn(
          { pid, port },
          "start: port in use by a live (non-orphan) sireno-deck vite — leaving it alone",
        )
        continue
      }
      try {
        process.kill(pid, "SIGTERM")
        logger.warn(
          { pid, port },
          "start: killed orphan sireno-deck vite bound to daemon port",
        )
      } catch {
        // already dead
      }
    }
  }
  // brief grace so SIGTERM takes effect before the new daemon binds
  await new Promise((r) => setTimeout(r, 500))
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
    removeStartLock()
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
  removeRuntimeStateFile()
  removeChildrenFile()
  removeStartLock()
}

const resolveConfigPath = (options: StartOptions): ResolveConfigPathResult => {
  // ponytail: the daemon honors the cached pointer first so the running
  // session keeps editing the same config it was launched with. When the
  // cached path is gone (e.g. worktree removed) we fall through to the
  // shared precedence: cli arg → XDG → run folder.
  const cached = readConfigPath()
  const cachedUsable = cached !== null && existsSync(cached) ? cached : null
  if (cachedUsable !== null) {
    return { path: cachedUsable, source: "cli" }
  }
  return resolveRunConfigPath({
    ...(options.config !== undefined ? { config: options.config } : {}),
    ...(options.xdgConfigHome !== undefined
      ? { xdgConfigHome: options.xdgConfigHome }
      : {}),
    ...(options.homeDir !== undefined ? { homeDir: options.homeDir } : {}),
    logger: options.logger,
  })
}

const buildRuntimeFlags = (options: StartOptions): RuntimeFlags => ({
  emulator: options.emulator === true || options.remote === true,
  remote: options.remote,
  httpPort: options.httpPort ?? 3939,
  ...(options.deviceModel !== undefined
    ? { deviceModel: options.deviceModel }
    : {}),
  ...(options.port !== undefined ? { port: options.port } : {}),
})

const runInProcess = async (options: StartOptions): Promise<void> => {
  const { logger } = options

  const startLock = acquireStartLock()
  if (startLock === null) {
    throw new Error("another start is already in progress")
  }

  // ponytail: the start lock is only released by the post-runPipeline
  // .finally on a clean pipeline exit. But preflight/setup code below
  // (config read, addon scan, http server boot) can throw EADDRINUSE or
  // similar BEFORE runPipeline ever starts, leaving the lock orphaned
  // for 60s — which is exactly the user's "another start is already in
  // progress" error after a previous start crashed. Wrap the setup in a
  // try/catch that releases on throw, and also call release() in the
  // existing .finally so the runtime-exit path stays covered.
  try {
    await runInProcessSetup(options, logger, startLock.release)
  } catch (err) {
    startLock.release()
    throw err
  }
}

const runInProcessSetup = async (
  options: StartOptions,
  logger: pino.Logger,
  releaseLock: () => void,
): Promise<void> => {
  const resolved = resolveConfigPath(options)
  const configPath = resolved.path
  options.logger.info(
    { configPath, source: resolved.source },
    `start: using config ${configPath} (source: ${resolved.source})`,
  )
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
      remote: runtimeFlags.remote,
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
  runOptions.token = token
  const sentinel = generateSentinel(process.pid)
  process.env[SENTINEL_ENV_VAR] = sentinel
  process.env["SIRENO_TOKEN"] = token
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
      releaseLock()
      if (httpServer !== null) {
        try {
          await httpServer.stop()
          logger.info("daemon: http server stopped")
        } catch (err) {
          logger.warn({ err }, "daemon: http server stop failed")
        }
      }
      // ponytail: kill tracked children (frontend vite, emulator vite, ...)
      // BEFORE removing the children file. Without this, when the daemon
      // exits cleanly the children outlive it as init-adopted orphans, keep
      // their ports, and the next `start` invocation fails with EADDRINUSE
      // — exactly the user's "the frontend port still in use by children"
      // symptom. TerminateChildren sends SIGTERM (then SIGKILL after 2s)
      // and is awaited so the operation completes before process.exit.
      await terminateChildren({ logger, timeoutMs: 3_000 })
      removePidFile()
      removeTokenFile()
      removeRuntimeStateFile()
      removeChildrenFile()
      removeStartLock()
      logger.info("daemon: shutdown complete")
      // ponytail: explicit exit — without this, lingering handles in the
      // emulator's active-app polling or lingering ws-bridge connections keep
      // the event loop alive and the daemon process never terminates after
      // a startup failure. The systemd / fork-off flows don't go through
      // runInProcess, so this only affects the in-process daemon path.
      process.exit(process.exitCode ?? 0)
    })
}

// ponytail: dev-mode `start`. Production goes through systemd/launchd — the
// OS owns the daemon lifecycle and the wrapper exits as soon as `start` forks
// the service manager. Dev's `pnpm dev start` mirrors that shape: spawn the
// daemon via `spawnDetached`, write the pid file, return to the cli. The
// wrapper exits cleanly so `pnpm dev status | stop | restart | reload | logs`
// from any other shell work against the same pid-file contract production
// uses. No auto-restart: the daemon stays dead on crash, the operator runs
// `pnpm dev restart` to recover — same as production (systemd eventually
// gives up too).
const resolveCliRoot = (): string => {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolvePath(here, "..", "..", "..")
}

const buildDetachedArgs = (flags: RuntimeFlags): string[] => {
  const args: string[] = ["start"]
  if (flags.emulator) args.push("--emulator")
  if (flags.remote) args.push("--remote")
  if (flags.port !== undefined) args.push("--port", String(flags.port))
  if (flags.deviceModel !== undefined) {
    args.push("--device-model", flags.deviceModel)
  }
  if (flags.httpPort !== undefined && flags.httpPort !== 3939) {
    args.push("--http-port", String(flags.httpPort))
  }
  return args
}

const startInBackground = async (options: StartOptions): Promise<void> => {
  const { logger } = options
  const resolved = resolveConfigPath(options)
  const configPath = resolved.path
  logger.info(
    { configPath, source: resolved.source },
    `start: using config ${configPath} (source: ${resolved.source})`,
  )
  const runtimeFlags = buildRuntimeFlags(options)
  writeConfigPath(configPath)
  writeFlags(runtimeFlags)
  pruneStaleChildren(undefined, logger)
  await terminateChildren({ logger, timeoutMs: 2_000 })

  const binPath = resolvePath(resolveCliRoot(), "bin", "sirenodeck.js")
  const args = buildDetachedArgs(runtimeFlags)
  const { pid } = spawnDetached({
    binPath,
    args,
    remote: options.remote === true,
  })
  writePid(pid)
  logger.info(
    { pid, configPath, args },
    "start: daemon spawned, returning to cli",
  )
}

const startProduction = async (options: StartOptions): Promise<void> => {
  const { logger } = options
  const resolved = resolveConfigPath(options)
  const configPath = resolved.path
  logger.info(
    { configPath, source: resolved.source },
    `start: using config ${configPath} (source: ${resolved.source})`,
  )
  const runtimeFlags = buildRuntimeFlags(options)
  writeConfigPath(configPath)
  writeFlags(runtimeFlags)

  // ponytail: startup banner (printed by the command handler) replaces what
  // used to be a spinner here. The handler's waitForDaemonReady prints the
  // outro when the daemon is actually serving.
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

const probeSystemForFirstRun = async (
  options: StartOptions,
): Promise<{
  report: SystemReport
  summary: ReturnType<typeof summarizeReport>
} | null> => {
  const home = options.homeDir ?? process.env["HOME"] ?? ""
  const xdgConfigHome =
    options.xdgConfigHome ?? process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`
  const baseDeps = buildStandardProbeDeps()
  try {
    const report = await probeAllCached({
      ...baseDeps,
      homeDir: home !== "" ? home : baseDeps.homeDir,
      xdgConfigHome,
    })
    return { report, summary: summarizeReport(report) }
  } catch {
    return null
  }
}

const runFirstRunCheckIfNeeded = async (
  options: StartOptions,
  logger: pino.Logger,
): Promise<void> => {
  const probed = await probeSystemForFirstRun(options)
  if (probed === null) return
  const { summary } = probed
  const missing =
    summary.missingCapabilities.length > 0 ||
    summary.udevMissing ||
    summary.configMissing
  if (!missing) return

  if (process.env["SIRENO_SKIP_WIZARD"]) {
    logger.warn(
      { lines: summary.lines },
      "start: some requirements still missing — run `sirenodeck system-requirements` to fix",
    )
    return
  }

  if (!process.stdin.isTTY) {
    logger.warn(
      { lines: summary.lines },
      "start: missing requirements and no TTY — run `sirenodeck system-requirements` interactively to fix",
    )
    process.exitCode = 1
    return
  }

  const shouldRunWizard = await confirm({
    message:
      "It looks like this is your first run (missing config or system capabilities). Run the setup wizard now?",
    default: true,
  })
  if (!shouldRunWizard) {
    logger.warn(
      { lines: summary.lines },
      "start: requirements missing — continuing anyway. Run `sirenodeck system-requirements` later to fix.",
    )
    return
  }

  await systemRequirements({
    logger,
    ...(options.homeDir !== undefined ? { homeDir: options.homeDir } : {}),
    ...(options.xdgConfigHome !== undefined
      ? { xdgConfigHome: options.xdgConfigHome }
      : {}),
  })

  const reprobed = await probeSystemForFirstRun(options)
  if (reprobed === null) return
  const stillMissing =
    reprobed.summary.missingCapabilities.length > 0 ||
    reprobed.summary.udevMissing ||
    reprobed.summary.configMissing
  if (stillMissing) {
    logger.warn(
      { lines: reprobed.summary.lines },
      "start: some requirements still missing — exiting",
    )
    process.exitCode = 1
  }
}

const start = async (options: StartOptions): Promise<void> => {
  const { logger } = options

  // ponytail: skip the first-run wizard in the daemon child. The forked
  // daemon has `SIRENO_DAEMON_CHILD=1` and `stdio: ["ignore", "pipe", "pipe"]`
  // — stdin is closed, so the wizard's `!process.stdin.isTTY` branch fires,
  // sets `process.exitCode = 1`, and the daemon's `process.exit(exitCode)`
  // then exits 1. The supervisor reads that as "unexpected exit" and respawns
  // the child, which re-runs the wizard, exits 1, respawns — visible to the
  // operator as the CLI restarting in a tight loop. The parent already ran
  // the wizard before forking, so the child has no business re-running it.
  if (isUnderServiceManager()) {
    await runInProcess(options)
    return
  }

  await runFirstRunCheckIfNeeded(options, logger)

  // ponytail: clear the daemon's expected ports before spawning. This is
  // the load-bearing fix for "the frontend port is in use by children":
  // even when the previous daemon's children file is gone (e.g. after a
  // SIGKILL that left orphans adopted by systemd), the port still binds
  // the orphan. ss -ltnp → SIGTERM every listener → 500ms grace → start.
  // Cost: bounded, no-op when the ports are free.
  await killPortListeners(
    options.emulator === true
      ? [5180, 3939, 52937, 52938]
      : [5180, 3939, 52937],
    logger,
  )

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
    removeRuntimeStateFile()
    removeChildrenFile()
    removeStartLock()
  } else {
    // ponytail: previous daemon is dead (or never started cleanly) — kill any
    // children it left behind (frontend vite on :5180, emulator vite on :52938,
    // ws-bridge on :52937). Without this, the children's ports stay bound
    // by orphans and the new daemon's preflight can't bind them — user's
    // complaint: "the frontend port still in use by children". terminateChildren
    // sends SIGTERM, waits 2s, then SIGKILL on stragglers.
    if (existing !== null) {
      logger.warn(
        { pid: existing },
        "start: existing daemon pid is dead — cleaning up before starting",
      )
    }
    await terminateChildren({ logger, timeoutMs: 2_000 })
    pruneStaleChildren(undefined, logger)
    if (existing !== null) {
      removePidFile()
      removeTokenFile()
      removeRuntimeStateFile()
      removeChildrenFile()
      removeStartLock()
    }
  }

  if (isDevInvocation()) {
    await startInBackground(options)
  } else {
    await startProduction(options)
  }
}

export default start
