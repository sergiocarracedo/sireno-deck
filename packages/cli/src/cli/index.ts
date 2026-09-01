import { join } from "node:path"

import type { ArgumentsCamelCase, CommandModule } from "yargs"

import { createLogger } from "@/util/logger"
import { PACKAGE_NAME } from "@/version"

import { logsCommand } from "./commands/logs"
import { reload, type ReloadOptions } from "./commands/reload"
import { restart, type RestartOptions } from "./commands/restart"
import start, { type StartOptions } from "./commands/start"
import { status, type StatusOptions } from "./commands/status"
import { stop, type StopOptions } from "./commands/stop"
import { systemRequirementsCommand } from "./commands/system-requirements"
import { resolveDaemonPaths } from "@/util/daemon"
import { snapshotDaemonLog } from "@/util/log-reader"
import {
  buildStartupBanner,
  printAddonCheckResults,
  printDaemonEvents,
  printDaemonUrl,
  printStartupComplete,
  printStartupFailed,
  waitForFullStart,
  type StartOutcome,
} from "./startup-display"
import { runBuiltinAddonChecks } from "@/addon/check-runner"
import { installPackage, type InstallOptions } from "./commands/install"
import type { PackageManager } from "./package-manager"

export interface GlobalOptions {
  verbose?: boolean
  logLevel?: string
  quiet?: boolean
  json?: boolean
}

interface StartArgs extends GlobalOptions {
  config?: string
  port?: number
  emulator?: boolean
  remote?: boolean
  deviceModel?: string
  httpPort?: number
  logs?: boolean
  system?: boolean
  autoopen?: boolean
}

interface StatusArgs extends GlobalOptions {}
interface StopArgs extends GlobalOptions {}
interface LogsArgs extends GlobalOptions {
  follow?: boolean
  lines?: number
}
interface ReloadArgs extends GlobalOptions {
  logs?: boolean
}
interface RestartArgs extends GlobalOptions {
  logs?: boolean
}

interface InstallArgs extends GlobalOptions {
  packageName: string
  config?: string
  global?: boolean
  packageManager?: PackageManager
}

export const buildLogger = (
  argv: ArgumentsCamelCase<GlobalOptions>,
): ReturnType<typeof createLogger> => {
  const normalized = argv.logLevel === "none" ? "silent" : argv.logLevel
  const level =
    argv.quiet || normalized === "silent"
      ? "silent"
      : (normalized ?? (argv.verbose ? "debug" : "info"))
  return createLogger({
    verbose: argv.verbose,
    json: argv.json ?? false,
    level,
  })
}

const startCommand: CommandModule<object, StartArgs> = {
  command: "start",
  describe: "Start the sirenodeck daemon",
  builder: (yargs) =>
    yargs
      .option("config", { type: "string", description: "Path to config.yml" })
      .option("port", {
        type: "number",
        description: "Port for the local server (0 = random free port)",
      })
      .option("emulator", {
        type: "boolean",
        default: false,
        description:
          "Run the emulator (full UI with sidebar, toolbar, device selector) at 127.0.0.1. Browser auto-opens unless --no-autoopen.",
      })
      .option("autoopen", {
        type: "boolean",
        default: true,
        description:
          "Auto-open the emulator URL in a browser after start. Pass --no-autoopen for headless / capture runs.",
      })
      .option("remote", {
        type: "boolean",
        default: false,
        description:
          "Open the emulator server to LAN clients. Implies --emulator. Binds 0.0.0.0; prints a QR for the deck-only view with token-gated HTTP.",
      })
      .option("device-model", {
        type: "string",
        description: "Emulator device model (mk2, plus, mini, xl)",
      })
      .option("http-port", {
        type: "number",
        default: 3939,
        description:
          "Port for the prod HTTP server that serves the bundled frontend with WS token injection",
      })
      .option("system", {
        type: "boolean",
        default: false,
        description:
          "Auto-install as system-wide service (requires root). Default: user-level.",
      })
      .option("logs", {
        type: "boolean",
        default: false,
        description: "After start, follow the service log (Ctrl+C to exit)",
      }),
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: StartOptions = {
      logger,
      ...(argv.config !== undefined ? { config: argv.config } : {}),
      ...(argv.port !== undefined ? { port: argv.port } : {}),
      ...(argv.emulator !== undefined ? { emulator: argv.emulator } : {}),
      ...(argv.remote !== undefined ? { remote: argv.remote } : {}),
      ...(argv.deviceModel !== undefined
        ? { deviceModel: argv.deviceModel }
        : {}),
      ...(argv.httpPort !== undefined
        ? { httpPort: argv.httpPort as number }
        : {}),
      ...(argv.system === true ? { system: true } : {}),
      ...(argv.autoopen === false ? { noAutoOpen: true } : {}),
    }
    try {
      await buildStartupBanner(
        {
          emulator: argv.emulator === true,
          ...(argv.deviceModel !== undefined
            ? { deviceModel: argv.deviceModel }
            : {}),
          ...(argv.port !== undefined ? { port: argv.port } : {}),
        },
        argv,
      )
      // ponytail: snapshot the daemon log size BEFORE the daemon's
      // restart writes anything new. We use this to surface
      // daemon-emitted warnings inline after the start completes,
      // without reading the full log history.
      const logSnapshot = snapshotDaemonLog()
      const logPath = join(resolveDaemonPaths().runtimeDir, "service.log")
      const startPromise = start(options)
      const outcome: StartOutcome = await waitForFullStart({
        port: options.port ?? 52937,
        tcpTimeoutMs: 30_000,
        runtimeTimeoutMs: 30_000,
        logPath,
        logSnapshot,
      })
      // ponytail: print events the daemon emitted between the snapshot
      // and now, BEFORE the success/failure line — operator's eye
      // lands on each one even when stdout is a pipe. Silent on 0
      // events.
      printDaemonEvents(outcome.events)

      if (outcome.runtimeReady && outcome.state !== null) {
        await printDaemonUrl(outcome.state, outcome.token ?? "")
        // ponytail: per-addon requirement checks (playerctl for media, etc.).
        // Never blocks the daemon — failing checks are surfaced as warnings so
        // the operator can act on them without digging into the log.
        printAddonCheckResults(await runBuiltinAddonChecks())
        printStartupComplete()
      } else if (outcome.tcpReady) {
        // ponytail: TCP is bound but the daemon didn't write runtime
        // state in 30s. The daemon is alive but the runtime pipeline
        // is still booting (or stuck). Fail loudly with whatever
        // warnings the daemon emitted so the operator doesn't have to
        // dig into the log file.
        const message =
          "daemon: TCP bound on 52937 but runtime state did not appear in 30s"
        logger.warn(message)
        process.exitCode = 1
        printStartupFailed(message)
        return
      } else {
        // ponytail: TCP never bound. Either the daemon crashed during
        // boot, or port 52937 is held by an unrelated process. Either
        // way, the start failed — the operator needs to know.
        const message = `daemon: port ${options.port ?? 52937} did not accept connections in 30s`
        logger.warn(message)
        process.exitCode = 1
        printStartupFailed(message)
        return
      }
      await startPromise
    } catch (err) {
      printStartupFailed(err)
      const e = err as { issues?: unknown; message?: unknown }
      const message =
        e &&
        typeof e === "object" &&
        "message" in e &&
        typeof e.message === "string"
          ? e.message
          : "command failed"
      logger.error({ err }, message)
      process.exitCode = 1
    }
  },
}

const stopCommand: CommandModule<object, StopArgs> = {
  command: "stop",
  describe: "Stop the running sirenodeck daemon",
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: StopOptions = { logger }
    await stop(options)
  },
}

const statusCommand: CommandModule<object, StatusArgs> = {
  command: "status",
  describe: "Check sirenodeck daemon status",
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: StatusOptions = { logger }
    await status(options)
  },
}

const reloadCommand: CommandModule<object, ReloadArgs> = {
  command: "reload",
  describe: "Send SIGUSR1 to the daemon (in-place reload)",
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: ReloadOptions = { logger }
    await reload(options)
  },
}

const restartCommand: CommandModule<object, RestartArgs> = {
  command: "restart",
  describe: "Restart the sirenodeck daemon",
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: RestartOptions = { logger }
    await restart(options)
  },
}

const installCommand: CommandModule<object, InstallArgs> = {
  command: "install <packageName>",
  describe: "Install and configure an addon or theme",
  builder: (yargs) =>
    yargs
      .positional("packageName", {
        type: "string",
        demandOption: true,
        description: "npm package name",
      })
      .option("config", { type: "string", description: "Path to config.yml" })
      .option("global", {
        type: "boolean",
        default: false,
        description: "Install globally",
      })
      .option("package-manager", { choices: ["pnpm", "npm", "yarn"] as const }),
  handler: async (argv) => {
    await installPackage({
      packageName: argv.packageName,
      ...(argv.config !== undefined ? { config: argv.config } : {}),
      ...(argv.global === true ? { global: true } : {}),
      ...(argv.packageManager !== undefined
        ? { packageManager: argv.packageManager }
        : {}),
    } satisfies InstallOptions)
  },
}

export const buildCli = async (): Promise<{
  scriptName: string
  commands: CommandModule<object, GlobalOptions>[]
  packageName: string
}> => {
  return {
    scriptName: PACKAGE_NAME,
    commands: [
      startCommand,
      stopCommand,
      statusCommand,
      restartCommand,
      reloadCommand,
      logsCommand as CommandModule<object, GlobalOptions>,
      systemRequirementsCommand as CommandModule<object, GlobalOptions>,
      installCommand as CommandModule<object, GlobalOptions>,
    ],
    packageName: PACKAGE_NAME,
  }
}
