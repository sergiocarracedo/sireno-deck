import type pino from "pino"

import { join } from "node:path"

import {
  isRunning,
  readFlags,
  readPid,
  resolveDaemonPaths,
} from "@/util/daemon"
import {
  readDaemonEventsFromSnapshot,
  snapshotDaemonLog,
} from "@/util/log-reader"

import { ensureInstalled, invokeManager } from "./service-manager"
import start, { type StartOptions } from "./start"
import stop from "./stop"
import {
  printDaemonEvents,
  printRestartComplete,
  printRestartFailed,
  waitForFullStart,
  waitForPortFree,
  type StartOutcome,
} from "../startup-display"

export interface RestartOptions {
  readonly logger: pino.Logger
  readonly system?: boolean
}

// ponytail: dev mode forks the daemon via spawnDetached from the wrapper,
// not via systemctl/launchctl. invokeManager in dev would shell out to
// the OS service manager and either fail or no-op against a daemon it
// never started. Read the cached flags.json (written by startInBackground)
// and run the in-process stop + start pair instead.
const flagsToStartOptions = (
  flags: ReturnType<typeof readFlags>,
  logger: pino.Logger,
): StartOptions | null => {
  if (flags === null) return null
  return {
    logger,
    emulator: flags.emulator,
    ...(flags.remote === true ? { remote: true } : {}),
    ...(flags.deviceModel !== undefined
      ? { deviceModel: flags.deviceModel }
      : {}),
    ...(flags.port !== undefined ? { port: flags.port } : {}),
    httpPort: flags.httpPort,
  }
}

const logPathFor = (): string =>
  join(resolveDaemonPaths().runtimeDir, "service.log")

export const restart = async (options: RestartOptions): Promise<void> => {
  const { logger } = options

  if (isDevInvocation()) {
    const startOptions = flagsToStartOptions(readFlags(), logger)
    if (startOptions === null) {
      logger.warn(
        "restart: no cached flags.json — pass them on the command line (e.g. `pnpm dev restart --emulator`)",
      )
      return
    }
    const snapshot = snapshotDaemonLog()
    const logPath = logPathFor()
    await stop({ logger })
    await start(startOptions)
    const outcome: StartOutcome = await waitForFullStart({
      port: startOptions.port ?? 52937,
      tcpTimeoutMs: 30_000,
      runtimeTimeoutMs: 30_000,
      logPath,
      logSnapshot: snapshot,
    })
    printDaemonEvents(outcome.events)
    if (outcome.runtimeReady && outcome.state !== null) {
      printRestartComplete()
    } else {
      const message = outcome.tcpReady
        ? "daemon: TCP bound but runtime state did not appear in 5s"
        : "daemon: port 52937 did not accept connections in 30s"
      logger.warn(message)
      process.exitCode = 1
      printRestartFailed(message)
    }
    return
  }

  await ensureInstalled({
    logger,
    ...(options.system === true ? { system: true } : {}),
  })
  const snapshot = snapshotDaemonLog()
  const logPath = logPathFor()
  await invokeManager({ action: "restart", logger })
  // ponytail: in production, systemctl restart doesn't return a pid,
  // so we wait for the new daemon's WS port to accept connections,
  // then poll the pid file for the new pid (written by the daemon's
  // runInProcessSetup), then read its runtime state.
  const port = 52937
  await waitForPortFree(port, 3_000)
  const pid = readPid()
  if (pid === null || !isRunning(pid)) {
    const message =
      "daemon: systemctl restart succeeded but no daemon is running"
    logger.warn(message)
    process.exitCode = 1
    printRestartFailed(message)
    return
  }
  logger.info({ pid }, "restart: daemon restarted (waiting for readiness)")
  const outcome = await waitForFullStart({
    port,
    tcpTimeoutMs: 30_000,
    runtimeTimeoutMs: 30_000,
    logPath,
    logSnapshot: snapshot,
  })
  printDaemonEvents(outcome.events)
  if (outcome.runtimeReady && outcome.state !== null) {
    printRestartComplete()
  } else {
    const message = outcome.tcpReady
      ? "daemon: TCP bound but runtime state did not appear in 5s"
      : "daemon: port 52937 did not accept connections in 30s"
    logger.warn(message)
    process.exitCode = 1
    printRestartFailed(message)
  }
}

const isDevInvocation = (): boolean => (process.argv[1] ?? "").endsWith(".ts")

export default restart
