#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { buildCli } from "./index";
import { createLogger } from "@/util/logger";

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
let processExitInProgress = false;

const installProcessGuards = (logger: ReturnType<typeof createLogger>): void => {
  process.on("uncaughtException", (err, origin) => {
    logger.fatal(
      { err, origin },
      "uncaughtException — exiting to surface the failure",
    );
    if (!processExitInProgress) {
      processExitInProgress = true;
      process.exit(1);
    }
  });
  process.on("unhandledRejection", (reason) => {
    logger.fatal(
      { reason },
      "unhandledRejection — exiting to surface the failure",
    );
    if (!processExitInProgress) {
      processExitInProgress = true;
      process.exit(1);
    }
  });
};

const main = async (): Promise<void> => {
  const args = process.argv;
  const isJson = args.indexOf("--json") !== -1;
  const isVerbose = args.indexOf("--verbose") !== -1 || args.indexOf("-v") !== -1;
  const logger = createLogger({ verbose: isVerbose, json: isJson });
  installProcessGuards(logger);
  const { scriptName, commands, packageName } = await buildCli();

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
      description: "Override log level (trace, debug, info, warn, error, fatal)",
    })
    .demandCommand(1, "Run $0 --help to see available commands.")
    .strict()
    .help()
    .alias("help", "h")
    .version(packageName)
    .alias("version", "V");

  for (const cmd of commands) {
    parser.command(cmd);
  }

  try {
    await parser.parseAsync();
  } catch (error) {
    const e = error as { issues?: unknown; message?: string };
    const message =
      e && typeof e === "object" && "message" in e && typeof e.message === "string"
        ? e.message
        : "command failed";
    if (e && Array.isArray(e.issues)) {
      logger.error({ err: error }, message);
    } else {
      logger.error({ err: error }, "command failed");
    }
    process.exitCode = 1;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
