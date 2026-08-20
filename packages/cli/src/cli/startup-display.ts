import { connect, type Socket } from "node:net"

import qrcode from "qrcode"

import type pino from "pino"

import { listDevices, type DeviceDescriptor } from "@/device"

import {
  probeAllCached,
  probeCommandExecution,
  probeInternetAccess,
  probeMediaAccess,
  resetProbeCache,
  type RuntimeFeatureProbe,
  type SystemReport,
} from "@/system/setup-wizard"

import { cancel, intro, log, outro } from "@/ui/console"

import { buildStandardProbeDeps } from "./probe-deps"

interface BannerOptions {
  readonly emulator: boolean
  readonly deviceModel?: string
  readonly port?: number
}

interface BannerDeps {
  readonly probeAll: typeof probeAllCached
  readonly probeMedia: typeof probeMediaAccess
  readonly probeExec: typeof probeCommandExecution
  readonly probeHttp: typeof probeInternetAccess
  readonly listDevices: typeof listDevices
  readonly resetCache: typeof resetProbeCache
}

const defaultBannerDeps: BannerDeps = {
  probeAll: probeAllCached,
  probeMedia: probeMediaAccess,
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

export const waitForDaemonReady = async (
  port: number = DEFAULT_PORT,
  timeoutMs: number = READY_TIMEOUT_MS,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await checkTcp("127.0.0.1", port, READY_INTERVAL_MS)) return
    await new Promise((r) => setTimeout(r, READY_INTERVAL_MS))
  }
}

interface FeatureItem {
  readonly name: string
  readonly available: boolean
  readonly reason?: string
}

export const formatFeaturesLine = (items: ReadonlyArray<FeatureItem>): string =>
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

  const [report, media, exec, http, devices] = await Promise.all([
    deps.probeAll(buildStandardProbeDeps()),
    deps.probeMedia(),
    deps.probeExec(),
    deps.probeHttp(),
    deps.listDevices(),
  ])

  const items: FeatureItem[] = [
    toFeatureItem("keystrokes", toSystemCap(report, "keyMacro")),
    toFeatureItem("clipboard", toSystemCap(report, "clipboard")),
    toFeatureItem("notifications", toSystemCap(report, "notification")),
    toFeatureItem("active-win", toSystemCap(report, "activeApp")),
    toFeatureItem("media", media),
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

export const printStartupComplete = (): void => {
  if (!process.stdout.isTTY) return
  outro("✓ SirenoDeck started")
}

// ponytail: dev-mode operator affordance. After `pnpm dev start` succeeds,
// the operator hasn't seen the daemon do anything yet — there's no
// signal that the reload path works or that the log is live. Prompt
// them with a Y/n reload + tail for ~2 s. The reload triggers SIGUSR1
// against the daemon (which the runtime now handles via
// runtime.invalidate() — see signal-provider in commands/run.ts), and
// the bounded tail window keeps control flowing without forcing the
// operator to type Ctrl+C. Skipped on non-TTY (CI, ssh without tty,
// systemd) and on --quiet / --log-level silent.
const RELOAD_TAIL_WINDOW_MS = 2_000
export const RELOAD_TAIL_WINDOW = RELOAD_TAIL_WINDOW_MS

export interface PromptReloadAndTailOptions {
  readonly logger: pino.Logger
}

export const promptReloadAndTail = async (
  options: PromptReloadAndTailOptions,
): Promise<void> => {
  if (!process.stdout.isTTY) return
  const { confirm } = await import("@/ui/console")
  const { resolveDaemonPaths } = await import("@/util/daemon")
  const { reload } = await import("./commands/reload")
  const { tailLogs } = await import("@/util/log-tail")

  const answer = await confirm({
    message: "Reload + tail logs now? [Y/n]",
    initialValue: true,
  })
  if (!answer) return

  await reload({ logger: options.logger })

  const logPath = `${resolveDaemonPaths().runtimeDir}/service.log`
  await Promise.race([
    tailLogs({ logPath, follow: true, lines: 50 }),
    new Promise<void>((resolve) => setTimeout(resolve, RELOAD_TAIL_WINDOW_MS)),
  ])
}

export const printStartupFailed = (err: unknown): void => {
  if (!process.stdout.isTTY) return
  cancel(
    `✗ Failed to start SirenoDeck: ${err instanceof Error ? err.message : String(err)}`,
  )
}

export const printEmulatorQrBanner = async (options: {
  readonly emulatorUrl: string
  readonly token: string
  readonly addresses: ReadonlyArray<string>
  readonly deckOnly?: boolean
}): Promise<void> => {
  const { emulatorUrl, token, addresses, deckOnly = false } = options
  const port = emulatorUrl.split(":").pop() ?? ""
  const buildUrl = (host: string): string => {
    const params = new URLSearchParams()
    if (token.length > 0) params.set("token", token)
    if (deckOnly) params.set("deckOnly", "1")
    return `http://${host}:${port}?${params.toString()}`
  }
  const localUrl = buildUrl("127.0.0.1")
  const isTty = Boolean(process.stdout.isTTY)
  const output = (text: string): void => {
    process.stdout.write(text)
  }
  const qrGenerate = isTty
    ? (text: string) => qrcode.toString(text, { type: "terminal", small: true })
    : undefined

  if (addresses.length === 0) {
    output("\n  Emulator:  ")
    output(localUrl)
    output("\n")
    output(
      "\x1b[33m  warning: no LAN interfaces detected — QR may not reach your phone.\x1b[0m\n\n",
    )
    output(
      "\x1b[33m  warning: --remote binds the WS bridge to 0.0.0.0; anyone on the same network can connect using the URL above (token-gated).\x1b[0m\n\n",
    )
    return
  }

  output("\n  Emulator (LAN):\n")
  for (const addr of addresses) {
    const iface = "LAN"
    const qrUrl = buildUrl(addr)
    if (qrGenerate !== undefined) {
      output("\n")
      const qr = await qrGenerate(qrUrl)
      output(qr)
      output(`  ${qrUrl}  ← ${iface}\n`)
    } else {
      output(`  ${qrUrl}  ← ${iface}\n`)
    }
  }
  output("\n")
  output(
    "\x1b[33m  warning: --remote binds the WS bridge to 0.0.0.0; anyone on the same network can connect using the URL above (token-gated).\x1b[0m\n\n",
  )
}
