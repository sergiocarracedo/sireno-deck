#!/usr/bin/env node
import { fileURLToPath } from 'node:url'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { createLogger } from '@/util/logger'
import { startDaemon, startEmulator } from './commands/start'
import { checkStatus } from './commands/status'
import { stopDaemon } from './commands/stop'

export const cli = async () => {
  const logger = createLogger({ verbose: process.argv.includes('--verbose') })

  await yargs(hideBin(process.argv))
    .scriptName('sireno')
    .usage('$0 <command> [options]')
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose debug logging',
      default: false,
    })
    .option('config', {
      type: 'string',
      description: 'Path to config.yml',
    })
    .command(
      'start',
      'Start the sireno-deck daemon',
      (command) =>
        command
          .option('skip-browser-install', {
            type: 'boolean',
            default: false,
            description: 'Skip the check and auto-install of Playwright Chromium',
          })
          .option('renderer', {
            type: 'string',
            choices: ['dom', 'vite'] as const,
            default: 'dom',
            description:
              'Render pipeline: "dom" (legacy in-process reconciler) or "vite" (Vite-served React app — Phase 75.1)',
          }),
      async (argv) =>
        startDaemon({
          config: argv.config,
          logger,
          skipBrowserInstall: argv.skipBrowserInstall,
          renderer: argv.renderer as 'dom' | 'vite',
        }),
    )
    .command(
      'emulate',
      'Start a local browser deck emulator without hardware',
      (command) =>
        command
          .option('key-count', {
            type: 'number',
            description: 'Virtual Stream Deck key count',
            default: 15,
          })
          .option('port', {
            type: 'number',
            description:
              'Port for the local emulator page (0 chooses a free port)',
            default: 0,
          })
          .option('skip-browser-install', {
            type: 'boolean',
            default: false,
            description: 'Skip the check and auto-install of Playwright Chromium',
          }),
      async (argv) =>
        startEmulator({
          config: argv.config,
          keyCount: argv.keyCount,
          logger,
          port: argv.port,
          skipBrowserInstall: argv.skipBrowserInstall,
        }),
    )
    .command(
      'stop',
      'Stop the running daemon',
      () => {},
      async () => stopDaemon({ logger }),
    )
    .command(
      'status',
      'Check daemon status',
      () => {},
      async () => checkStatus({ logger }),
    )
    .demandCommand(1, 'Run $0 --help to see available commands')
    .strict()
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'V')
    .parseAsync()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
