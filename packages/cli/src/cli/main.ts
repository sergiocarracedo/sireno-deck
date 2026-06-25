#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { buildCli } from "./index";
import { createLogger } from "@/util/logger";

const main = async (): Promise<void> => {
  const args = process.argv;
  const isJson = args.indexOf("--json") !== -1;
  const isVerbose = args.indexOf("--verbose") !== -1 || args.indexOf("-v") !== -1;
  const logger = createLogger({ verbose: isVerbose, json: isJson });
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
