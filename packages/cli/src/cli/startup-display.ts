import { connect, type Server, createServer, type Socket } from "node:net"

import qrcode from "qrcode"

import type pino from "pino"

import { listDevices, type DeviceDescriptor } from "@/device"
import type { AddonCheckOutcome } from "@/addon/check-runner"

import {
  probeAllCached,
  probeCommandExecution,
  probeInternetAccess,
  resetProbeCache,
  type RuntimeFeatureProbe,
  type SystemReport,
} from "@/system/setup-wizard"

import { cancel, intro, log, outro } from "@/cli/prompt"

import {
  readDaemonEventsFromSnapshot,
  type DaemonEvent,
  type DaemonLogSnapshot,
} from "@/util/log-reader"
import { readRuntimeState, type RuntimeState } from "@/util/daemon"

import { buildStandardProbeDeps } from "./probe-deps"

interface BannerOptions {
  readonly emulator: boolean
  readonly deviceModel?: string
  readonly port?: number
}

interface BannerDeps {
  readonly probeAll: typeof probeAllCached
  readonly probeExec: typeof probeCommandExecution
  readonly probeHttp: typeof probeInternetAccess
  readonly listDevices: typeof listDevices
  readonly resetCache: typeof resetProbeCache
}

const defaultBannerDeps: BannerDeps = {
  probeAll: probeAllCached,
  probeExec: probeCommandExecution,
  probeHttp: probeInternetAccess,
  listDevices,
  resetCache: resetProbeCache,
}

export const isLogSuppressed = (
  argv: Readonly<{ quiet?: boolean; logLevel?: string }>,
): boolean =>
  argv.quiet === true || argv.logLevel === "silent" || argv.logLevel === "none"

const DEFAULT_PORT = 52937
const READY_TIMEOUT_MS = 30_000
const READY_INTERVAL_MS = 100
const RUNTIME_STATE_TIMEOUT_MS = 5_000
const PORT_FREE_TIMEOUT_MS = 3_000

const checkTcp = (
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> =>
  new Promise((resolve) => {
    const sock: Socket = connect(port, host)
    let settled = false
    const finish = (ok: boolean): void => {
      if (settled) return
      settled = true
      sock.destroy()
      resolve(ok)
    }
    sock.once("connect", () => finish(true))
    sock.once("error", () => finish(false))
    setTimeout(() => finish(false), timeoutMs)
  })

// ponytail: wrapper around `checkTcp` that polls until the daemon's
// WS port accepts a connection, or until `timeoutMs` elapses. The
// caller decides what to do on timeout (CLI: fail loudly with the
// accumulated daemon events). The TCP probe is intentionally cheap —
// a single `connect()` per interval — and Node handles the OS-level
// `ECONNREFUSED` on a closed port without holding the event loop.
export const waitForDaemonReady = async (
  port: number = DEFAULT_PORT,
  timeoutMs: number = READY_TIMEOUT_MS,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await checkTcp("127.0.0.1", port, READY_INTERVAL_MS)) return
    await new Promise((r) => setTimeout(r, READY_INTERVAL_MS))
  }
  throw new DaemonNotReadyError(port, timeoutMs)
}

export class DaemonNotReadyError extends Error {
  readonly port: number
  readonly timeoutMs: number
  constructor(port: number, timeoutMs: number) {
    super(
      `daemon: port ${port} did not accept connections within ${timeoutMs}ms — daemon may have failed to start`,
    )
    this.name = "DaemonNotReadyError"
    this.port = port
    this.timeoutMs = timeoutMs
  }
}

// ponytail: the daemon writes `runtime-state.json` only after its WS
// bridge + vite supervisors are up. Polling for the file is the
// canonical "fully ready" signal — much stronger than TCP-on-port
// (which fires the moment the WS server binds, before supervisors
// have stabilized). Returns the parsed state, or `null` on timeout.
export const waitForRuntimeState = async (
  timeoutMs: number = RUNTIME_STATE_TIMEOUT_MS,
): Promise<RuntimeState | null> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = readRuntimeState()
    if (state !== null) return state
    await new Promise((r) => setTimeout(r, READY_INTERVAL_MS))
  }
  return null
}

// ponytail: bind a `Server` to the target port. If `EADDRINUSE` fires,
// the port is bound by some other process (most likely the daemon we
// just stopped, with a stuck TIME_WAIT or an orphan vite). If the
// bind succeeds, the port is genuinely free. Used by `stop` to
// confirm the daemon has fully released its socket.
export const waitForPortFree = async (
  port: number,
  timeoutMs: number = PORT_FREE_TIMEOUT_MS,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const ok = await tryBind(port)
    if (ok) return true
    await new Promise((r) => setTimeout(r, READY_INTERVAL_MS))
  }
  return false
}

const tryBind = (port: number): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    let server: Server | null = null
    const cleanup = (ok: boolean): void => {
      if (server !== null) {
        server.close()
        server = null
      }
      resolve(ok)
    }
    server = createServer()
    server.once("error", () => cleanup(false))
    server.once("listening", () => cleanup(true))
    try {
      server.listen(port, "127.0.0.1")
    } catch {
      cleanup(false)
    }
  })

interface FeatureItem {
  readonly name: string
  readonly available: boolean
  readonly reason?: string
}

const formatFeaturesLine = (items: ReadonlyArray<FeatureItem>): string =>
  items
    .map((it) =>
      it.available
        ? `[✓ ${it.name}]`
        : `[✗ ${it.name}${it.reason !== undefined ? ` — ${it.reason}` : ""}]`,
    )
    .join(" ")

const toFeatureItem = (
  name: string,
  probe: RuntimeFeatureProbe,
): FeatureItem =>
  probe.reason !== undefined
    ? { name, available: probe.available, reason: probe.reason }
    : { name, available: probe.available }

const deviceLabel = (
  emulator: boolean,
  deviceModel: string | undefined,
  devices: ReadonlyArray<DeviceDescriptor>,
): string => {
  if (emulator) {
    return `Emulator (${deviceModel ?? "mk2"})`
  }
  if (devices.length === 0) {
    return "detecting…"
  }
  const d = devices[0]
  return d !== undefined ? `${d.model} (${d.id})` : "detecting…"
}

export interface BannerResult {
  readonly featuresLine: string
  readonly deviceLabel: string
}

export const buildStartupBanner = async (
  options: BannerOptions,
  argv: Readonly<{ quiet?: boolean; logLevel?: string }>,
  deps: BannerDeps = defaultBannerDeps,
): Promise<BannerResult | null> => {
  if (isLogSuppressed(argv) || !process.stdout.isTTY) return null

  deps.resetCache()

  const [report, exec, http, devices] = await Promise.all([
    deps.probeAll(buildStandardProbeDeps()),
    deps.probeExec(),
    deps.probeHttp(),
    deps.listDevices(),
  ])

  // ponytail: drop the misleading "media — chromium not installed" probe from
  // the system-feature line. That probe is for Playwright tests (frontend
  // chromium install), not the media addon. The actual media tooling check
  // (playerctl / wpctl / osascript / powershell) lives in the addon-checks
  // section printed after the URL — see runBuiltinAddonChecks / printAddonCheckResults.
  const items: FeatureItem[] = [
    toFeatureItem("keystrokes", toSystemCap(report, "keyMacro")),
    toFeatureItem("clipboard", toSystemCap(report, "clipboard")),
    toFeatureItem("notifications", toSystemCap(report, "notification")),
    toFeatureItem("active-win", toSystemCap(report, "activeApp")),
    toFeatureItem("exec", exec),
    toFeatureItem("http", http),
  ]

  const featuresLine = formatFeaturesLine(items)
  const label = deviceLabel(options.emulator, options.deviceModel, devices)

  intro("Starting SirenoDeck")
  log.info(`Device: ${label}`)
  log.info(featuresLine)
  return { featuresLine, deviceLabel: label }
}

const toSystemCap = (
  report: SystemReport,
  key: "keyMacro" | "clipboard" | "notification" | "activeApp",
): RuntimeFeatureProbe => {
  const cap = report.capabilities[key]
  if (cap.available) return { available: true }
  return {
    available: false,
    reason:
      cap.missing.length > 0
        ? cap.missing.join(", ")
        : cap.reason.length > 0
          ? cap.reason
          : undefined,
  }
}

// ponytail: warning / error lines from the daemon, surfaced inline. The
// CLI is the operator's interface to the daemon — they shouldn't have
// to grep `service.log` to find out what went wrong during start /
// ponytail: same shape as formatHuman but applied to in-memory DaemonEvent
// objects from log-reader. Drop the trailing `(HH:MM:SS)` — timestamps stay
// in service.log for correlation; the terminal only needs level + msg.
export const printDaemonEvents = (
  events: ReadonlyArray<DaemonEvent>,
  output: (text: string) => void = (text) => process.stdout.write(text),
): void => {
  if (events.length === 0) return
  for (const ev of events) {
    const color =
      ev.level === "fatal"
        ? "\x1b[31m"
        : ev.level === "error"
          ? "\x1b[31m"
          : "\x1b[33m"
    const label = ev.level.toUpperCase().padEnd(5)
    const component =
      ev.component.length > 0
        ? ` \x1b[90m[\x1b[0m${ev.component}\x1b[90m]\x1b[0m\x1b[0m`
        : ""
    output(`${color}  ${label}${component} ${ev.message}\x1b[0m\n`)
  }
}

// ponytail: the URL the operator needs to open in their browser. The
// token is regenerated per daemon session, so we always show it in the
// URL — operators copy-paste the URL into the browser. For `--remote`
// we use the existing QR banner (phone-friendly); for plain
// `--emulator` we print a plain text URL.
export const printDaemonUrl = async (
  state: RuntimeState,
  output: (text: string) => void = (text) => process.stdout.write(text),
): Promise<void> => {
  const port = state.emulatorUrl.split(":").pop() ?? ""
  const buildUrl = (host: string, deckOnly: boolean): string => {
    const params = new URLSearchParams()
    if (state.token.length > 0) params.set("token", state.token)
    if (deckOnly) params.set("deckOnly", "1")
    return `http://${host}:${port}?${params.toString()}`
  }
  const localUrl = buildUrl("127.0.0.1", false)
  output(`\n  Emulator:  ${localUrl}\n`)
  if (state.addresses.length > 0) {
    const isTty = Boolean(process.stdout.isTTY)
    if (isTty) {
      output("\n  Emulator (LAN):\n")
      for (const addr of state.addresses) {
        const url = buildUrl(addr, true)
        // ponytail: qrcode.toString returns a Promise — awaiting renders the
        // QR ASCII art inline. Without the await the raw Promise object
        // stringifies as "[object Promise]" and the operator sees no QR.
        const qr = await qrcode.toString(url, { type: "terminal", small: true })
        output(`\n${qr}  ${url}\n`)
      }
    } else {
      for (const addr of state.addresses) {
        output(`  ${addr}: ${buildUrl(addr, false)}\n`)
      }
    }
  }
  output("\n  Manage with: `p dev status`, `p dev reload`, `p dev stop`.\n")
}

// ponytail: the load-bearing function for the CLI's "wait until fully
// started, then show the URL" flow. The CLI calls this from the
// `start` handler and surfaces events + URL inline. On any failure
// path the caller exits non-zero — operators expect the CLI to fail
// loudly if the daemon didn't come up, not silently exit 0.
export interface StartOutcome {
  readonly state: RuntimeState | null
  readonly events: ReadonlyArray<DaemonEvent>
  readonly tcpReady: boolean
  readonly runtimeReady: boolean
}

export interface WaitForStartOptions {
  readonly port: number
  readonly tcpTimeoutMs: number
  readonly runtimeTimeoutMs: number
  readonly logPath: string
  readonly logSnapshot: DaemonLogSnapshot
}

export const waitForFullStart = async (
  options: WaitForStartOptions,
): Promise<StartOutcome> => {
  let tcpReady = false
  try {
    await waitForDaemonReady(options.port, options.tcpTimeoutMs)
    tcpReady = true
  } catch (err) {
    if (!(err instanceof DaemonNotReadyError)) throw err
  }
  const runtimeReady = tcpReady
  const state = runtimeReady
    ? await waitForRuntimeState(options.runtimeTimeoutMs)
    : null
  const events = readDaemonEventsFromSnapshot(
    options.logPath,
    options.logSnapshot,
  )
  return { state, events, tcpReady, runtimeReady }
}

// ponytail: per-addon requirement check results, surfaced inline next
// to the URL. Same `[✓ ...]` / `[✗ ...]` pattern as the system feature
// line so operators learn one visual language. Grouped by addon so the
// operator can quickly locate the failing addon when something is wrong.
export const printAddonCheckResults = (
  outcomes: ReadonlyArray<AddonCheckOutcome>,
  output: (text: string) => void = (text) => process.stdout.write(text),
): void => {
  if (outcomes.length === 0) return
  const grouped = new Map<string, AddonCheckOutcome[]>()
  for (const outcome of outcomes) {
    const bucket = grouped.get(outcome.addonName) ?? []
    bucket.push(outcome)
    grouped.set(outcome.addonName, bucket)
  }
  output("\n  Addon checks:\n")
  for (const [addonName, items] of grouped) {
    const parts = items
      .map((it) =>
        it.available
          ? `[✓ ${it.checkName}]`
          : `[✗ ${it.checkName}${it.reason !== undefined ? ` — ${it.reason}` : ""}]`,
      )
      .join(" ")
    output(`    ${addonName}: ${parts}\n`)
  }
}

export const printStartupComplete = (): void => {
  if (!process.stdout.isTTY) return
  outro("✓ Sireno Deck started")
}

export const printStartupFailed = (err: unknown): void => {
  if (!process.stdout.isTTY) return
  cancel(
    `✗ Failed to start SirenoDeck: ${err instanceof Error ? err.message : String(err)}`,
  )
}

export const printRestartComplete = (): void => {
  if (!process.stdout.isTTY) return
  outro("✓ Sireno Deck restarted")
}

export const printRestartFailed = (err: unknown): void => {
  if (!process.stdout.isTTY) return
  cancel(
    `✗ Failed to restart SirenoDeck: ${err instanceof Error ? err.message : String(err)}`,
  )
}

export const printStopComplete = (portFree: boolean): void => {
  if (!process.stdout.isTTY) return
  if (portFree) {
    outro("✓ Sireno Deck stopped")
  } else {
    cancel(
      "✗ Sireno Deck process exited but port 52937 is still bound — see `p dev status` for orphans",
    )
  }
}
