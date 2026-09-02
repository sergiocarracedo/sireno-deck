import type pino from "pino"

import {
  isRunning,
  readChildren,
  readConfigPath,
  readFlags,
  readPid,
  readRuntimeState,
  resolveDaemonPaths,
} from "@/util/daemon"
import { listDevices } from "@/device"

import { cancel, intro, log, outro } from "@/cli/prompt"

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
    intro("sirenodeck status")
    log.error("Daemon is not running")
    cancel("✗ No daemon process found")
    return
  }

  const alive = isRunning(pid)
  const flags = readFlags(paths)
  const state = alive ? readRuntimeState(paths) : null
  const childrenState = readChildren(paths)
  const childPids = childrenState?.pids ?? []
  const configPath = readConfigPath(paths)

  intro("sirenodeck status")

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
    const frontendUrl = state.frontendUrl
    log.info(`Frontend URL : ${frontendUrl}`)
    if (state.configUiUrl.length > 0) {
      log.info(`Config UI URL : ${state.configUiUrl}`)
    }
    log.info(`Bridge URL   : ${state.wsUrl}`)
    outro("✓ Status snapshot")
  } else {
    cancel("✗ Stale pid file — run `p dev stop` to clean up")
  }
}

export default status
