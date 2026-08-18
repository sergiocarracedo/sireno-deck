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
import { readRuntimeState } from "@/util/daemon"
import {
  buildStartupBanner,
  printEmulatorQrBanner,
  printStartupComplete,
  printStartupFailed,
  waitForDaemonReady,
} from "./startup-display"

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

export const buildLogger = (
  argv: ArgumentsCamelCase<GlobalOptions>,
): ReturnType<typeof createLogger> => {
  const normalized = argv.logLevel === "none" ? "silent" : argv.logLevel
  const level =
    argv.quiet || normalized === "silent"
      ? "silent"
      : (normalized ?? (argv.verbose ? "debug" : "error"))
  return createLogger({
    verbose: argv.verbose,
    json: argv.json ?? false,
    level,
  })
}

const startCommand: CommandModule<object, StartArgs> = {
  command: "start",
  describe: "Start the sireno-deck daemon",
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
          "Run the emulator (full UI with sidebar, toolbar, device selector) at 127.0.0.1. Browser auto-opens.",
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
      ...(argv.logs === true ? { logs: true } : {}),
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
      const startPromise = start(options)
      await waitForDaemonReady(options.port ?? 52937).catch(() => undefined)
      if (argv.remote === true) {
        // ponytail: poll for runtime-state.json — the daemon writes it after
        // its WS bridge + vite supervisors come up, which races the CLI's
        // waitForDaemonReady (TCP 52937 opens before the emulator flow
        // writes the state file). Retry up to 5s.
        let state = readRuntimeState()
        const deadline = Date.now() + 5_000
        while (state === null && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 100))
          state = readRuntimeState()
        }
        if (state !== null) {
          await printEmulatorQrBanner({
            emulatorUrl: state.emulatorUrl,
            token: state.token,
            addresses: state.addresses,
            deckOnly: true,
          })
        }
      }
      printStartupComplete()
      await startPromise
    } catch (err) {
      printStartupFailed(err)
      const e = err as { issues?: unknown; message?: string }
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
  describe: "Stop the running sireno-deck daemon",
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: StopOptions = { logger }
    await stop(options)
  },
}

const statusCommand: CommandModule<object, StatusArgs> = {
  command: "status",
  describe: "Check sireno-deck daemon status",
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: StatusOptions = { logger }
    await status(options)
  },
}

const reloadCommand: CommandModule<object, ReloadArgs> = {
  command: "reload",
  describe: "Send SIGUSR1 to the daemon (in-place reload)",
  builder: (yargs) =>
    yargs.option("logs", {
      type: "boolean",
      default: false,
      description: "After reload, follow the service log",
    }),
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: ReloadOptions = {
      logger,
      ...(argv.logs === true ? { logs: true } : {}),
    }
    await reload(options)
  },
}

const restartCommand: CommandModule<object, RestartArgs> = {
  command: "restart",
  describe: "Restart the sireno-deck daemon",
  builder: (yargs) =>
    yargs.option("logs", {
      type: "boolean",
      default: false,
      description: "After restart, follow the service log",
    }),
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: RestartOptions = {
      logger,
      ...(argv.logs === true ? { logs: true } : {}),
    }
    await restart(options)
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
    ],
    packageName: PACKAGE_NAME,
  }
}
