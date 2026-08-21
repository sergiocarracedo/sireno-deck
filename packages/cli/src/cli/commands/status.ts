import type pino from "pino"

import {
  isRunning,
  readChildren,
  readConfigPath,
  readFlags,
  readPid,
  readRuntimeState,
  readToken,
  resolveDaemonPaths,
} from "@/util/daemon"

import { cancel, intro, log, outro } from "@/cli/prompt"

import { printDaemonUrl } from "../startup-display"

export interface StatusOptions {
  logger: pino.Logger
}

const formatUptime = (ms: number): string => {
  if (ms < 0) return "—"
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export const status = async ({ logger }: StatusOptions): Promise<void> => {
  void logger // kept for callers that want pino logs out-of-band

  const paths = resolveDaemonPaths()
  const pid = readPid(paths)

  if (pid === null) {
    intro("sireno-deck status")
    log.error("Daemon is not running")
    cancel("✗ No daemon process found")
    return
  }

  const alive = isRunning(pid)
  const token = readToken(paths)
  const flags = readFlags(paths)
  const state = alive ? readRuntimeState(paths) : null
  const childrenState = readChildren(paths)
  const childPids = childrenState?.pids ?? []
  const configPath = readConfigPath(paths)

  intro("sireno-deck status")

  if (alive) {
    const startedAt = state?.startedAt ?? null
    const uptime =
      startedAt !== null ? formatUptime(Date.now() - startedAt) : "—"
    log.info(`Status:    running for ${uptime} (pid ${pid})`)
  } else {
    log.warn(`Status:    stale pid file (pid ${pid} not alive)`)
  }

  const mode =
    state?.emulatorMode === true
      ? "emulator"
      : flags?.emulator === true
        ? "emulator"
        : "hardware"
  const device =
    state?.emulatorMode === true
      ? `Emulator${typeof flags?.deviceModel === "string" ? ` (${flags.deviceModel})` : ""}`
      : "—"
  log.info(`Mode:      ${mode}${mode === "emulator" ? ` · ${device}` : ""}`)

  const remoteOn = state?.remote === true || flags?.remote === true
  log.info(`Remote:    ${remoteOn ? "on" : "off"}`)

  log.info(`Config:    ${configPath ?? "—"}`)

  const theme = state?.theme ?? "default"
  log.info(`Theme:     ${theme}`)

  if (token !== null) {
    log.info(`Token:     present (${token.length} chars)`)
  } else {
    log.warn("Token:     missing or empty")
  }

  if (childPids.length > 0) {
    log.info(`Children:  ${childPids.length} (${childPids.join(", ")})`)
  } else {
    log.info("Children:  none tracked")
  }

  if (alive) {
    if (state !== null) {
      log.info(`URL:       ${state.emulatorUrl}`)
    }
    // ponytail: printDaemonUrl opens its own intro/outro block. Close
    // *this* section first so the URL block renders as a sibling, not a
    // nested child of the status dashboard.
    outro("✓ Status snapshot")
    if (state !== null) await printDaemonUrl(state)
  } else {
    cancel("✗ Stale pid file — run `p dev stop` to clean up")
  }
}

export default status
