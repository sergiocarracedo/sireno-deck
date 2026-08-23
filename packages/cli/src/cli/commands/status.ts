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
import { listDevices } from "@/device"

import { cancel, intro, log, outro } from "@/cli/prompt"

export interface StatusOptions {
  logger: pino.Logger
  showToken?: boolean
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

const appendToken = (url: string, token: string | null): string => {
  if (token === null || token.length === 0) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}token=${token}`
}

export const status = async ({
  logger,
  showToken = false,
}: StatusOptions): Promise<void> => {
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

  const isEmulator = state?.emulatorMode === true || flags?.emulator === true
  const deviceModel =
    typeof flags?.deviceModel === "string" ? flags.deviceModel : "mk2"

  if (isEmulator) {
    log.info(`Device :   Emulator (${deviceModel}) (emulator mode)`)
  } else {
    let hardwareLabel = "—"
    try {
      const devices = await listDevices()
      if (devices.length > 0 && devices[0] !== undefined) {
        hardwareLabel = devices[0].label
      }
    } catch {
      // ponytail: HID enumeration can throw on missing kernel modules or
      // permission errors. Fall through to the "—" placeholder — status
      // must not blow up if device detection is unavailable.
    }
    log.info(`Device :   ${hardwareLabel} (hardware mode)`)
  }

  const remoteOn = state?.remote === true || flags?.remote === true
  log.info(`Remote:    ${remoteOn ? "on" : "off"}`)

  log.info(`Config:    ${configPath ?? "—"}`)

  const theme = state?.theme ?? "default"
  log.info(`Theme:     ${theme}`)

  if (childPids.length > 0) {
    log.info(`Children:  ${childPids.length} (${childPids.join(", ")})`)
  } else {
    log.info("Children:  none tracked")
  }

  if (alive && state !== null) {
    const frontendUrl = showToken
      ? appendToken(state.frontendUrl, token)
      : state.frontendUrl
    log.info(`Frontend URL : ${frontendUrl}`)
    log.info(`Bridge URL   : ${state.wsUrl}`)
    if (state.emulatorMode) {
      const emulatorUrl = showToken
        ? appendToken(state.emulatorUrl, token)
        : state.emulatorUrl
      log.info(`Emulator URL : ${emulatorUrl}`)
    }
    if (token !== null && !showToken) {
      log.info("Tip: run with --show-token to reveal the auth token.")
    }
    outro("✓ Status snapshot")
  } else {
    cancel("✗ Stale pid file — run `p dev stop` to clean up")
  }
}

export default status
