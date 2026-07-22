import type { ArgumentsCamelCase, CommandModule } from "yargs"

import { createLogger } from "@/util/logger"
import { PACKAGE_NAME } from "@/version"

import { run, type RunOptions } from "./commands/run"
import start, { type StartOptions } from "./commands/start"
import { status, type StatusOptions } from "./commands/status"
import { stop, type StopOptions } from "./commands/stop"
import { serviceCommands } from "./commands/service"

export interface GlobalOptions {
  verbose?: boolean
  logLevel?: string
  json?: boolean
}

interface RunArgs extends GlobalOptions {
  config?: string
  port?: number
  emulator?: boolean
  dev?: boolean
  deviceModel?: string
}

interface StartArgs extends GlobalOptions {
  config?: string
  port?: number
  emulator?: boolean
  deviceModel?: string
}

interface StatusArgs extends GlobalOptions {}
interface StopArgs extends GlobalOptions {}

const buildLogger = (
  argv: ArgumentsCamelCase<GlobalOptions>,
): ReturnType<typeof createLogger> =>
  createLogger({
    verbose: argv.verbose,
    json: argv.json ?? false,
    ...(argv.logLevel !== undefined ? { level: argv.logLevel } : {}),
  })

const runCommand: CommandModule<object, RunArgs> = {
  command: "run",
  describe: "Run sireno-deck in the foreground (development mode)",
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
      .option("dev", {
        type: "boolean",
        default: false,
        description: "Enable HMR (vite dev servers)",
      })
      .option("device-model", {
        type: "string",
        description:
          "Emulator device model (mk2, plus, mini, xl) — affects keyCount",
      }),
  handler: async (argv) => {
    const logger = buildLogger(argv)
    const options: RunOptions = {
      logger,
      ...(argv.config !== undefined ? { config: argv.config } : {}),
      ...(argv.port !== undefined ? { port: argv.port } : {}),
      ...(argv.emulator !== undefined ? { emulator: argv.emulator } : {}),
      ...(argv.dev !== undefined ? { dev: argv.dev } : {}),
      ...(argv.deviceModel !== undefined
        ? { deviceModel: argv.deviceModel }
        : {}),
    }
    try {
      await run(options)
    } catch (err) {
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

const startCommand: CommandModule<object, StartArgs> = {
  command: "start",
  describe: "Start the sireno-deck daemon (detached)",
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
      ...(argv.httpPort !== undefined ? { httpPort: argv.httpPort as number } : {}),
    }
    try {
      await start(options)
    } catch (err) {
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

const serviceCommand: CommandModule<object, object> = {
  command: "service <subcommand>",
  describe: "Manage the sireno-deck native background service",
  builder: (yargs) =>
    yargs
      .command(serviceCommands)
      .demandCommand(1, "service <subcommand> required"),
  handler: () => {
    // all work done in subcommands
  },
}

export const buildCli = async (): Promise<{
  scriptName: string
  commands: CommandModule<object, GlobalOptions>[]
  packageName: string
}> => {
  void buildLogger
  return {
    scriptName: PACKAGE_NAME,
    commands: [runCommand, startCommand, stopCommand, statusCommand, serviceCommand],
    packageName: PACKAGE_NAME,
  }
}
