#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { buildCli } from "./index";
import { createLogger } from "@/util/logger";

const main = async (): Promise<void> => {
  const logger = createLogger({ verbose: process.argv.includes("--verbose") });
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
    logger.error({ err: error }, "command failed");
    process.exitCode = 1;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
