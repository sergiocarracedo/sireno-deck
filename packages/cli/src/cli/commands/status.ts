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

const group = (title: string, details: readonly string[]): string =>
  [
    title,
    ...details.map((detail, i) => {
      const separator = detail.indexOf(": ")
      const formatted =
        separator < 0
          ? detail
          : `${detail.slice(0, separator + 2)}${colorize(detail.slice(separator + 2), 97)}`
      return `${i === details.length - 1 ? "└─" : "├─"} ${formatted}`
    }),
  ].join("\n")

const colorize = (value: string, color: number): string => {
  const enabled =
    process.env.NO_COLOR === undefined &&
    process.env.FORCE_COLOR !== "0" &&
    (process.stdout.isTTY ||
      (process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== ""))
  return enabled
    ? `\u001b[${color}m${value.replaceAll("\u001b[39m", `\u001b[${color}m`)}\u001b[39m`
    : value
}

const coloredStatus = (value: string): string => {
  const color = /^(running|ready|healthy|responding|same source)/i.test(value)
    ? 32
    : /^(failed|unreachable|MISMATCH|stale)/i.test(value)
      ? 31
      : 33
  return colorize(value, color)
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

  let daemonDetails: string[] = []
  if (alive) {
    const startedAt = state?.startedAt ?? null
    const uptime =
      startedAt !== null ? formatUptime(Date.now() - startedAt) : "—"
    daemonDetails = [
      `PID: ${pid}`,
      `Uptime: ${uptime}`,
      `Children: ${childPids.length > 0 ? `${childPids.length} (${childPids.join(", ")})` : "none tracked"}`,
    ]
  } else {
    log.warn(`Status:    stale pid file (pid ${pid} not alive)`)
  }

  const isEmulator = state?.emulatorMode === true || flags?.emulator === true
  const deviceModel =
    typeof flags?.deviceModel === "string" ? flags.deviceModel : "mk2"

  if (isEmulator) {
    log.info(group("Device", [`Mode: emulator`, `Model: ${deviceModel}`]))
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
    log.info(group("Device", [`Mode: hardware`, `Model: ${hardwareLabel}`]))
  }

  const remoteOn = state?.remote === true || flags?.remote === true
  const theme = state?.theme ?? "default"
  log.info(
    group("Configuration", [
      `Config: ${configPath ?? "—"}`,
      `Theme: ${theme}`,
      `Remote: ${remoteOn ? "on" : "off"}`,
    ]),
  )

  if (!alive && childPids.length > 0) {
    log.info(`Children:  ${childPids.length} (${childPids.join(", ")})`)
  } else if (!alive) {
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
      return `${identity.version} build ${identity.buildId?.slice(0, 12) ?? "unknown"} (${coloredStatus(matches)})`
    }
    log.info(
      group(`Daemon: ${coloredStatus("running")}`, [
        ...daemonDetails,
        `Version: ${identityLabel(health?.identity ?? null)}`,
      ]),
    )
    log.info(group("CLI", [`Version: ${identityLabel(runtimeIdentity)}`]))
    log.info(
      group(`Core: ${coloredStatus(health?.core ?? "unknown")}`, [
        `Version: ${identityLabel(health?.identity ?? null)}`,
      ]),
    )
    log.info(
      group(`Bridge: ${coloredStatus(bridge.status)}`, [
        `Check: authenticated WebSocket handshake`,
        `URL: ${state.wsUrl}`,
        `Version: ${identityLabel(bridge.identity)}`,
      ]),
    )
    log.info(
      group(`Frontend: ${coloredStatus(frontend)}`, [
        `Check: HTTP`,
        `URL: ${state.frontendUrl}`,
        `Version: ${identityLabel(frontendIdentity)}`,
      ]),
    )
    log.info(
      group(`Config UI: ${coloredStatus(configUi)}`, [
        `Check: HTTP`,
        ...(state.configUiUrl ? [`URL: ${state.configUiUrl}`] : []),
        `Version: ${identityLabel(configUiIdentity)}`,
      ]),
    )
    if (isEmulator) {
      log.info("Renderer: not applicable (emulator mode)")
    } else {
      const rendererState =
        health?.renderer?.state === "healthy" &&
        health.renderer.lastFrameAt !== null &&
        Date.now() - health.renderer.lastFrameAt > 10_000
          ? "degraded (no recent frame)"
          : (health?.renderer?.state ?? "unknown")
      const lastFrame = health?.renderer?.lastFrameAt
        ? new Date(health.renderer.lastFrameAt).toISOString()
        : "unknown"
      log.info(
        group(`Renderer: ${coloredStatus(rendererState)}`, [
          `Last frame: ${lastFrame}`,
          `Version: ${identityLabel(health?.identity ?? null)}`,
        ]),
      )
    }
    outro("✓ Status snapshot")
  } else {
    if (alive)
      log.info(group(`Daemon: ${coloredStatus("running")}`, daemonDetails))
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
