import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { homedir, platform } from "node:os"
import { join } from "node:path"

import type pino from "pino"

function getStateBaseDir(): string {
  if (process.env.XDG_STATE_HOME) {
    return process.env.XDG_STATE_HOME
  }

  return platform() === "linux"
    ? join(homedir(), ".local", "state")
    : join(homedir(), ".local", "share")
}

export function getPidDir(): string {
  return join(getStateBaseDir(), "sireno-deck")
}

export function getPidPath(): string {
  return join(getPidDir(), "daemon.pid")
}

export function ensurePidDir(): void {
  mkdirSync(getPidDir(), { recursive: true })
}

export function writePid(pid = process.pid): void {
  ensurePidDir()
  writeFileSync(getPidPath(), String(pid), "utf-8")
}

export function readPid(): number | null {
  if (!existsSync(getPidPath())) {
    return null
  }

  const content = readFileSync(getPidPath(), "utf-8").trim()
  const pid = Number.parseInt(content, 10)

  return Number.isNaN(pid) ? null : pid
}

export function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function removePidFile(): void {
  try {
    unlinkSync(getPidPath())
  } catch {
    // PID file might already be gone.
  }
}

export function setupSignalHandlers(logger: pino.Logger): () => void {
  const cleanup = () => {
    logger.info("shutting down...")
    removePidFile()
    logger.flush()
    process.exit(0)
  }

  process.on("SIGTERM", cleanup)
  process.on("SIGINT", cleanup)

  return () => {
    process.off("SIGTERM", cleanup)
    process.off("SIGINT", cleanup)
  }
}
