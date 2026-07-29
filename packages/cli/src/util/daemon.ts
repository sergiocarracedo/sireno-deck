import {
  chmodSync,
  closeSync,
  existsSync,
  fchmodSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { execSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { getuid, platform } from "node:process"

const getUid = (): number | null => {
  try {
    if (typeof getuid !== "function") return null
    return getuid()
  } catch {
    return null
  }
}

import type pino from "pino"

export interface DaemonPaths {
  runtimeDir: string
  pidFile: string
  tokenFile: string
  childrenFile: string
  configPathFile: string
  flagsFile: string
}

const writeAtomic = (path: string, content: string, mode: number): void => {
  const tmp = `${path}.tmp.${process.pid}`
  const fd = openSync(tmp, "w", mode)
  try {
    writeFileSync(fd, content, { encoding: "utf8" })
    fchmodSync(fd, mode)
  } finally {
    closeSync(fd)
  }
  renameSync(tmp, path)
}

export interface RuntimeFlags {
  emulator: boolean
  deviceModel?: string
  port?: number
  httpPort: number
}

const DAEMON_NAME = "sireno-deck"

const defaultRuntimeDir = (): string => {
  const xdg = process.env["XDG_RUNTIME_DIR"]
  if (xdg) return xdg

  switch (platform) {
    case "darwin":
      return join(homedir(), "Library", "Application Support", DAEMON_NAME)
    case "win32":
      return join(process.env["LOCALAPPDATA"] ?? tmpdir(), DAEMON_NAME)
    default: {
      const uid = getuid()
      return uid !== null
        ? join(tmpdir(), `sireno-deck-${uid}`)
        : join(tmpdir(), DAEMON_NAME)
    }
  }
}

export const resolveDaemonPaths = (): DaemonPaths => {
  const runtimeDir = defaultRuntimeDir()
  if (!existsSync(runtimeDir)) {
    mkdirSync(runtimeDir, { recursive: true })
    if (platform !== "win32") {
      chmodSync(runtimeDir, 0o700)
    }
  }
  return {
    runtimeDir,
    pidFile: join(runtimeDir, `${DAEMON_NAME}.pid`),
    tokenFile: join(runtimeDir, `${DAEMON_NAME}.token`),
    childrenFile: join(runtimeDir, `${DAEMON_NAME}.children.json`),
    configPathFile: join(runtimeDir, `${DAEMON_NAME}.config`),
    flagsFile: join(runtimeDir, `${DAEMON_NAME}.flags.json`),
  }
}

export interface StartLock {
  readonly release: () => void
}

export const acquireStartLock = (
  paths = resolveDaemonPaths(),
): StartLock | null => {
  const lockFile = `${paths.pidFile}.lock`
  let fd: number
  try {
    fd = openSync(lockFile, "wx", 0o600)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      try {
        const ageMs = Date.now() - statSync(lockFile).mtimeMs
        if (ageMs > 60_000) {
          try {
            unlinkSync(lockFile)
            fd = openSync(lockFile, "wx", 0o600)
          } catch {
            return null
          }
        } else {
          return null
        }
      } catch {
        return null
      }
    } else {
      throw err
    }
  }
  if (fd === undefined!) return null
  writeFileSync(fd, `${process.pid}\n`, { encoding: "utf8" })
  return {
    release: () => {
      try {
        closeSync(fd!)
        unlinkSync(lockFile)
      } catch {
        // ignore
      }
    },
  }
}

export const readPid = (paths = resolveDaemonPaths()): number | null => {
  if (!existsSync(paths.pidFile)) return null
  const raw = readFileSync(paths.pidFile, "utf8").trim()
  const pid = Number.parseInt(raw, 10)
  return Number.isFinite(pid) && pid > 0 ? pid : null
}

export const writePid = (pid: number, paths = resolveDaemonPaths()): void => {
  writeAtomic(paths.pidFile, `${pid}\n`, 0o600)
}

export const removePidFile = (paths = resolveDaemonPaths()): void => {
  if (existsSync(paths.pidFile)) unlinkSync(paths.pidFile)
}

export const SENTINEL_ENV_VAR = "SIRENO_DAEMON_SENTINEL"

export const generateSentinel = (pid: number): string =>
  `sireno-deck-${pid}-${randomBytes(8).toString("hex")}`

const readCmdline = (pid: number): string | null => {
  try {
    const raw = readFileSync(`/proc/${pid}/cmdline`, "utf8")
    return raw.replace(/\u0000/g, " ")
  } catch {
    return null
  }
}

const readCmdlinePs = (pid: number): string | null => {
  try {
    const out = execSync(`ps -p ${pid} -o command=`, {
      encoding: "utf8",
      timeout: 1000,
    }).trim()
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

export const isRunning = (pid: number): boolean => {
  if (pid <= 0) return false
  try {
    process.kill(pid, 0)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") return false
  }
  const sentinel = process.env[SENTINEL_ENV_VAR]
  if (!sentinel) return true
  const cmdline = platform === "darwin" ? readCmdlinePs(pid) : readCmdline(pid)
  if (cmdline === null) return false
  return cmdline.includes(sentinel)
}

export const generateToken = (): string => randomBytes(32).toString("base64url")

export const readToken = (paths = resolveDaemonPaths()): string | null => {
  if (!existsSync(paths.tokenFile)) return null
  const raw = readFileSync(paths.tokenFile, "utf8").trim()
  return raw.length > 0 ? raw : null
}

export const writeToken = (
  token: string,
  paths = resolveDaemonPaths(),
): void => {
  writeAtomic(paths.tokenFile, `${token}\n`, 0o600)
}

export const removeTokenFile = (paths = resolveDaemonPaths()): void => {
  if (existsSync(paths.tokenFile)) unlinkSync(paths.tokenFile)
}

export interface ChildrenState {
  pids: number[]
}

export const readChildren = (
  paths = resolveDaemonPaths(),
): ChildrenState | null => {
  if (!existsSync(paths.childrenFile)) return null
  try {
    const raw = readFileSync(paths.childrenFile, "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "pids" in parsed &&
      Array.isArray((parsed as { pids: unknown }).pids)
    ) {
      const pids = (parsed as { pids: unknown[] }).pids
        .map((p) => Number.parseInt(String(p), 10))
        .filter((p) => Number.isFinite(p) && p > 0)
      return { pids }
    }
  } catch {
    return null
  }
  return null
}

export const writeChildren = (
  state: ChildrenState,
  paths = resolveDaemonPaths(),
): void => {
  writeAtomic(paths.childrenFile, JSON.stringify(state), 0o600)
}

export const removeChildrenFile = (paths = resolveDaemonPaths()): void => {
  if (existsSync(paths.childrenFile)) unlinkSync(paths.childrenFile)
}

export const readConfigPath = (paths = resolveDaemonPaths()): string | null => {
  if (!existsSync(paths.configPathFile)) return null
  const raw = readFileSync(paths.configPathFile, "utf8").trim()
  return raw.length > 0 ? raw : null
}

export const writeConfigPath = (
  configPath: string,
  paths = resolveDaemonPaths(),
): void => {
  writeAtomic(paths.configPathFile, `${configPath}\n`, 0o600)
}

export const removeConfigPathFile = (paths = resolveDaemonPaths()): void => {
  if (existsSync(paths.configPathFile)) unlinkSync(paths.configPathFile)
}

export const readFlags = (
  paths = resolveDaemonPaths(),
): RuntimeFlags | null => {
  if (!existsSync(paths.flagsFile)) return null
  try {
    const raw = readFileSync(paths.flagsFile, "utf8")
    const parsed = JSON.parse(raw) as Partial<RuntimeFlags>
    if (
      typeof parsed.emulator !== "boolean" ||
      typeof parsed.httpPort !== "number"
    ) {
      return null
    }
    return {
      emulator: parsed.emulator,
      httpPort: parsed.httpPort,
      ...(typeof parsed.deviceModel === "string"
        ? { deviceModel: parsed.deviceModel }
        : {}),
      ...(typeof parsed.port === "number" ? { port: parsed.port } : {}),
    }
  } catch {
    return null
  }
}

export const writeFlags = (
  flags: RuntimeFlags,
  paths = resolveDaemonPaths(),
): void => {
  writeAtomic(paths.flagsFile, JSON.stringify(flags), 0o600)
}

export const removeFlagsFile = (paths = resolveDaemonPaths()): void => {
  if (existsSync(paths.flagsFile)) unlinkSync(paths.flagsFile)
}

// ponytail: child tracking is best-effort — orphans from a hard kill are reaped
// ponytail: terminateChildren first tries the pid as a process (the child
// itself) and then falls back to the pid as a NEGATIVE pid (process group
// leader). When vite is spawned with `detached: true` its pid IS the pgid,
// so kill(-pgid, SIGTERM) takes down the whole group in one shot — that's
// how we guarantee the frontend port doesn't stay bound by orphans after
// the daemon dies. Windows ignores the negative pid form silently.
const signalChildGroup = (pid: number, signal: NodeJS.Signals): void => {
  try {
    process.kill(pid, signal)
  } catch {
    // pid already dead or no permission — try as process group
  }
  try {
    process.kill(-pid, signal)
  } catch {
    // not a pgid or already gone
  }
}

export const terminateChildren = async ({
  timeoutMs = 5000,
  logger,
  paths = resolveDaemonPaths(),
}: {
  timeoutMs?: number
  logger?: pino.Logger
  paths?: DaemonPaths
}): Promise<void> => {
  const state = readChildren(paths)
  if (state === null || state.pids.length === 0) return

  const alive = state.pids.filter((p) => isRunning(p))
  if (alive.length === 0) {
    writeChildren({ pids: [] }, paths)
    return
  }

  // Phase 1: SIGTERM all
  for (const pid of alive) {
    signalChildGroup(pid, "SIGTERM")
    logger?.debug({ pid }, "daemon: sent SIGTERM to child (+ group)")
  }

  // Wait for graceful shutdown
  const deadline = Date.now() + timeoutMs
  let remaining = alive.filter((p) => isRunning(p))
  while (remaining.length > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200))
    remaining = remaining.filter((p) => isRunning(p))
  }

  // Phase 2: SIGKILL stragglers
  for (const pid of remaining) {
    signalChildGroup(pid, "SIGKILL")
    logger?.debug({ pid }, "daemon: sent SIGKILL to child (+ group)")
  }

  // Prune dead from tracked list
  const stillAlive = state.pids.filter((p) => isRunning(p))
  writeChildren({ pids: stillAlive }, paths)
  if (stillAlive.length < state.pids.length) {
    logger?.info(
      { killed: state.pids.length - stillAlive.length },
      "daemon: cleaned up terminated children",
    )
  }
}

export const appendChild = (
  pid: number,
  paths = resolveDaemonPaths(),
): void => {
  const current = readChildren(paths) ?? { pids: [] }
  if (current.pids.includes(pid)) return
  writeChildren({ pids: [...current.pids, pid] }, paths)
}

export const removeChild = (
  pid: number,
  paths = resolveDaemonPaths(),
): void => {
  const current = readChildren(paths)
  if (current === null) return
  const next = current.pids.filter((p) => p !== pid)
  if (next.length === current.pids.length) return
  writeChildren({ pids: next }, paths)
}

export const pruneStaleChildren = (
  paths = resolveDaemonPaths(),
  logger?: pino.Logger,
): number => {
  const current = readChildren(paths)
  if (current === null) return 0
  const alive = current.pids.filter((p) => isRunning(p))
  const pruned = current.pids.length - alive.length
  if (pruned === 0) return 0
  writeChildren({ pids: alive }, paths)
  for (const dead of current.pids.filter((p) => !isRunning(p))) {
    logger?.info({ pid: dead }, "daemon: pruned stale child pid")
  }
  return pruned
}
