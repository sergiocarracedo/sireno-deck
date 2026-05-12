#!/usr/bin/env node
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

const cli = () => {
  yargs(hideBin(process.argv))
    .scriptName("sireno")
    .usage("$0 <command> [options]")
    .command("start", "Start the sireno-deck daemon", () => {}, () => {
      console.log("start command - not yet implemented")
    })
    .command("stop", "Stop the running daemon", () => {}, () => {
      console.log("stop command - not yet implemented")
    })
    .command("status", "Check daemon status", () => {}, () => {
      console.log("status command - not yet implemented")
    })
    .demandCommand(1, "Run $0 --help to see available commands")
    .strict()
    .help()
    .parse()
}

cli()
