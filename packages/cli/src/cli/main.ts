#!/usr/bin/env node
import { fileURLToPath } from "node:url"

import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import { buildCli } from "./index"
import { createLogger } from "@/util/logger"
import { terminateChildren } from "@/util/daemon"
import {
  DAEMON_TITLE,
  FOREGROUND_TITLE,
  setProcessTitle,
  startParentDeathWatchdog,
} from "@/util/process-title"

// ponytail: process name shows up in `ps`/`top`/`pstree` so operators can
// tell which role is holding a port. The detached daemon is `sirenodeck:dm`
// (12 chars, fits Linux 15-char `comm`); foreground CLI invocations are
// `sirenodeck:cli`. Naming is diagnostic only — the kill identity gate
// still relies on cmdline + port + tracked PIDs.
const isDaemon = process.env["SIRENO_DAEMON_CHILD"] === "1"
setProcessTitle(isDaemon ? DAEMON_TITLE : FOREGROUND_TITLE)

/**
 * Install global handlers for uncaught exceptions and unhandled promise
 * rejections BEFORE any command runs. Without these, an error in an
 * async addon poller or a stray promise rejection in the deck runtime
 * would kill the process with no log output and no exit code.
 *
 * Handlers log at `fatal` level, then exit 1 so supervisors (systemd,
 * launchd, the bin/sirenodeck.js wrapper) can detect the failure.
 *
 * `processExitInProgress` guards against double-exit when both `exit`
 * events fire in sequence (common when child processes are still alive).
 */
let processExitInProgress = false

const killChildrenAndExit = (
  logger: ReturnType<typeof createLogger>,
  code: number,
): void => {
  if (processExitInProgress) return
  processExitInProgress = true
  // ponytail: 5s grace matches the run-pipeline's pushBlackFrame + drain delay
  // so the SIGINT handler doesn't cut off the in-flight device clear writes.
  void terminateChildren({ logger, timeoutMs: 5_000 })
    .catch((err: unknown) => {
      logger.warn({ err }, "main: terminate children failed")
    })
    .finally(() => {
      process.exit(code)
    })
}

const installProcessGuards = (
  logger: ReturnType<typeof createLogger>,
): void => {
  process.on("uncaughtException", (err, origin) => {
    logger.fatal(
      { err, origin },
      "uncaughtException — exiting to surface the failure",
    )
    killChildrenAndExit(logger, 1)
  })
  process.on("unhandledRejection", (reason) => {
    logger.fatal(
      { reason },
      "unhandledRejection — exiting to surface the failure",
    )
    killChildrenAndExit(logger, 1)
  })
  // ponytail: SIGINT/SIGTERM also reap children — supervisors (systemd,
  // launchd, our `stop`) send SIGTERM and we don't want orphaned vite/playwright.
  process.on("SIGTERM", () => {
    logger.info("main: SIGTERM received")
    killChildrenAndExit(logger, 0)
  })
  process.on("SIGINT", () => {
    logger.info("main: SIGINT received")
    killChildrenAndExit(logger, 0)
  })
  // ponytail: parent-death watchdog — when the dev wrapper dies (tsx watcher
  // killed, `bin/dev.js` SIGKILL'd, ...) the daemon is reparented to init and
  // its vite children keep their ports. The 1s ppid poll catches that and
  // routes through the same teardown as a graceful shutdown. Linux-only and
  // inactive when the daemon already runs under systemd (ppid=1 from boot).
  if (isDaemon) {
    startParentDeathWatchdog({
      logger,
      onOrphan: () => killChildrenAndExit(logger, 0),
    })
  }
}

const main = async (): Promise<void> => {
  const args = process.argv
  const isJson = args.indexOf("--json") !== -1
  const isVerbose =
    args.indexOf("--verbose") !== -1 || args.indexOf("-v") !== -1
  const logger = createLogger({ verbose: isVerbose, json: isJson })
  installProcessGuards(logger)
  const { scriptName, commands, packageName } = await buildCli()

  const parser = yargs(hideBin(process.argv))
    .scriptName(scriptName)
    .usage("$0 <command> [options]")
    .option("verbose", {
      alias: "v",
      type: "boolean",
      description: "Enable verbose debug logging",
      default: false,
    })
    .option("json", {
      type: "boolean",
      description: "Emit logs as JSON (default: human-friendly)",
      default: false,
    })
    .option("log-level", {
      type: "string",
      description:
        "Override log level (trace, debug, info, warn, error, fatal, silent, none)",
    })
    .option("quiet", {
      alias: "q",
      type: "boolean",
      default: false,
      description: "Suppress all logs and the startup banner (silent level)",
    })
    .demandCommand(1, "Run $0 --help to see available commands.")
    .strict()
    .help()
    .alias("help", "h")
    .version(packageName)
    .alias("version", "V")

  for (const cmd of commands) {
    parser.command(cmd)
  }

  try {
    await parser.parseAsync()
  } catch (error) {
    const e = error as { issues?: unknown; message?: string }
    const message =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof e.message === "string"
        ? e.message
        : "command failed"
    if (e && Array.isArray(e.issues)) {
      logger.error({ err: error }, message)
    } else {
      logger.error({ err: error }, "command failed")
    }
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main()
}
