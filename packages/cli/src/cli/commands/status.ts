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
import { requestDaemonHealth, requestDaemonToken } from "@/util/daemon-control"
import {
  probeBridgeInfo,
  probeHttp,
  probeWebIdentity,
  type BuildIdentity,
} from "./status-probes"
import { runtimeIdentity } from "@/util/runtime-identity"

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
    for (const component of [
      "Core",
      "Bridge",
      "Frontend",
      "Config UI",
      "Renderer",
      "Device",
    ]) {
      log.info(`${component}:    unknown (daemon not running)`)
    }
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
    const [
      token,
      health,
      frontend,
      configUi,
      frontendIdentity,
      configUiIdentity,
    ] = await Promise.all([
      requestDaemonToken(paths),
      requestDaemonHealth(paths),
      probeHttp(state.frontendUrl),
      state.configUiUrl
        ? probeHttp(state.configUiUrl)
        : Promise.resolve("unknown" as const),
      probeWebIdentity(state.frontendUrl, "frontend"),
      state.configUiUrl
        ? probeWebIdentity(state.configUiUrl, "config-ui")
        : Promise.resolve(null),
    ])
    const bridge = await probeBridgeInfo(state.wsUrl, token)
    const identityLabel = (identity: BuildIdentity | null): string => {
      if (!identity) return "version/build unknown"
      const matches =
        identity.buildId && health?.identity?.buildId
          ? identity.buildId === health.identity.buildId &&
            identity.version === health.identity.version
            ? "same source as daemon"
            : "MISMATCH"
          : "comparison unknown"
      return `${identity.version} build ${identity.buildId?.slice(0, 12) ?? "unknown"} (${matches})`
    }
    log.info(`CLI:         ${identityLabel(runtimeIdentity)}`)
    log.info(`Daemon:      ${identityLabel(health?.identity ?? null)}`)
    log.info(
      `Core:        ${health?.core ?? "unknown"} (${identityLabel(health?.identity ?? null)})`,
    )
    log.info(
      `Bridge:      ${bridge.status} (${identityLabel(bridge.identity)}; authenticated WebSocket handshake)`,
    )
    log.info(`Frontend:    ${frontend} (HTTP check)`)
    log.info(`Frontend build: ${identityLabel(frontendIdentity)}`)
    log.info(`Config UI:   ${configUi} (HTTP check)`)
    log.info(`Config UI build: ${identityLabel(configUiIdentity)}`)
    log.info(
      isEmulator
        ? "Renderer:    not applicable (emulator mode)"
        : `Renderer:    ${health?.renderer?.state === "healthy" && health.renderer.lastFrameAt !== null && Date.now() - health.renderer.lastFrameAt > 10_000 ? "degraded (no recent frame)" : (health?.renderer?.state ?? "unknown")} (last frame: ${health?.renderer?.lastFrameAt ? new Date(health.renderer.lastFrameAt).toISOString() : "unknown"}; ${identityLabel(health?.identity ?? null)})`,
    )
    const frontendUrl = state.frontendUrl
    log.info(`Frontend URL : ${frontendUrl}`)
    if (state.configUiUrl.length > 0) {
      log.info(`Config UI URL : ${state.configUiUrl}`)
    }
    log.info(`Bridge URL   : ${state.wsUrl}`)
    outro("✓ Status snapshot")
  } else {
    for (const component of [
      "Core",
      "Bridge",
      "Frontend",
      "Config UI",
      "Renderer",
    ]) {
      log.info(`${component}:    unknown (runtime state unavailable)`)
    }
    cancel(
      alive
        ? "✗ Daemon is running but runtime state is unavailable"
        : "✗ Stale pid file — daemon process is not running",
    )
  }
}

export default status
