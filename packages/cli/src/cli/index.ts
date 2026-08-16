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
import {
  buildStartupBanner,
  printStartupComplete,
  printStartupFailed,
  waitForDaemonReady,
} from "./startup-display"

export interface GlobalOptions {
  verbose?: boolean
  logLevel?: string
  devMode?: boolean
  quiet?: boolean
  json?: boolean
}

interface StartArgs extends GlobalOptions {
  config?: string
  port?: number
  emulator?: boolean
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
      : (normalized ??
        (argv.verbose ? "debug" : argv.devMode ? "info" : "error"))
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
        description: "Run in emulator mode",
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
