import {
  closeSync,
  fchmodSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { mkdirSync, existsSync } from "node:fs"
import { randomBytes } from "node:crypto"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { platform } from "node:process"

import type pino from "pino"

export interface DaemonPaths {
  runtimeDir: string
  pidFile: string
  tokenFile: string
  childrenFile: string
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
    default:
      return tmpdir()
  }
}

export const resolveDaemonPaths = (): DaemonPaths => {
  const runtimeDir = defaultRuntimeDir()
  if (!existsSync(runtimeDir)) {
    mkdirSync(runtimeDir, { recursive: true })
  }
  return {
    runtimeDir,
    pidFile: join(runtimeDir, `${DAEMON_NAME}.pid`),
    tokenFile: join(runtimeDir, `${DAEMON_NAME}.token`),
    childrenFile: join(runtimeDir, `${DAEMON_NAME}.children.json`),
  }
}

export const readPid = (paths = resolveDaemonPaths()): number | null => {
  if (!existsSync(paths.pidFile)) return null
  const raw = readFileSync(paths.pidFile, "utf8").trim()
  const pid = Number.parseInt(raw, 10)
  return Number.isFinite(pid) && pid > 0 ? pid : null
}

export const writePid = (pid: number, paths = resolveDaemonPaths()): void => {
  writeFileSync(paths.pidFile, `${pid}\n`, { encoding: "utf8" })
}

export const removePidFile = (paths = resolveDaemonPaths()): void => {
  if (existsSync(paths.pidFile)) unlinkSync(paths.pidFile)
}

export const isRunning = (pid: number): boolean => {
  if (pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM"
  }
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
  const fd = openSync(paths.tokenFile, "w", 0o600)
  try {
    writeFileSync(fd, `${token}\n`, { encoding: "utf8" })
    fchmodSync(fd, 0o600)
  } finally {
    closeSync(fd)
  }
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
  writeFileSync(paths.childrenFile, JSON.stringify(state), { encoding: "utf8" })
}

export const removeChildrenFile = (paths = resolveDaemonPaths()): void => {
  if (existsSync(paths.childrenFile)) unlinkSync(paths.childrenFile)
}

export interface StartDaemonOptions {
  logger: pino.Logger
  dryRun?: boolean
}

export const startDaemon = ({
  logger,
  dryRun = false,
}: StartDaemonOptions): { pid: number; pidFile: string } => {
  const paths = resolveDaemonPaths()
  const existing = readPid(paths)
  if (existing !== null && isRunning(existing)) {
    throw new Error(`Daemon already running with pid ${existing}`)
  }
  if (existing !== null) {
    logger.warn({ pid: existing }, "removing stale pid file")
    removePidFile(paths)
  }
  const pid = process.pid
  if (!dryRun) writePid(pid, paths)
  logger.info({ pid, pidFile: paths.pidFile }, "daemon started")
  return { pid, pidFile: paths.pidFile }
}

export interface StopDaemonOptions {
  logger: pino.Logger
}

export const stopDaemon = ({ logger }: StopDaemonOptions): void => {
  const paths = resolveDaemonPaths()
  const pid = readPid(paths)
  if (pid === null) {
    logger.info("no running daemon found")
    return
  }
  if (!isRunning(pid)) {
    logger.warn({ pid }, "stale pid file found")
    removePidFile(paths)
    return
  }
  logger.info({ pid }, "stopping daemon")
  process.kill(pid, "SIGTERM")
}

export interface CheckStatusOptions {
  logger: pino.Logger
}

export const checkStatus = ({ logger }: CheckStatusOptions): void => {
  const paths = resolveDaemonPaths()
  const pid = readPid(paths)
  if (pid === null) {
    logger.info("daemon is not running")
    return
  }
  if (isRunning(pid)) {
    logger.info({ pid, pidFile: paths.pidFile }, "daemon is running")
    return
  }
  logger.warn({ pid }, "stale pid file found")
  removePidFile(paths)
}
