import type pino from "pino"

import { join } from "node:path"

import {
  isRunning,
  readChildren,
  readPid,
  removeChildrenFile,
  removePidFile,
  removeRuntimeStateFile,
  removeTokenFile,
  resolveDaemonPaths,
} from "@/util/daemon"
import {
  readDaemonEventsFromSnapshot,
  snapshotDaemonLog,
} from "@/util/log-reader"

import {
  printDaemonEvents,
  printStopComplete,
  waitForPortFree,
} from "../startup-display"

export interface StopOptions {
  readonly logger: pino.Logger
}

const DEFAULT_PORT = 52937

const killGracefully = async (
  pid: number,
  logger: pino.Logger,
  label: string,
): Promise<void> => {
  if (!isRunning(pid)) {
    logger.debug({ pid, label }, "stop: already exited")
    return
  }
  logger.info({ pid, label }, "stop: SIGTERM")
  try {
    process.kill(pid, "SIGTERM")
  } catch (err) {
    logger.warn({ err, pid, label }, "stop: SIGTERM failed")
    return
  }
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline && isRunning(pid)) {
    await new Promise((r) => setTimeout(r, 100))
  }
  if (isRunning(pid)) {
    logger.warn({ pid, label }, "stop: did not exit in 5s, sending SIGKILL")
    try {
      process.kill(pid, "SIGKILL")
    } catch (err) {
      logger.warn({ err, pid, label }, "stop: SIGKILL failed")
    }
  }
}

export const stop = async ({ logger }: StopOptions): Promise<void> => {
  const pid = readPid()
  if (pid === null) {
    logger.info("stop: no running daemon found")
    return
  }

  // ponytail: snapshot the log BEFORE we kill the daemon. After the
  // kill, the daemon may write a final fatal/warn ("received SIGTERM"
  // or vite-shutdown errors); we surface those inline so the
  // operator sees the daemon's last words before the "stopped" line.
  const snapshot = snapshotDaemonLog()
  const logPath = join(resolveDaemonPaths().runtimeDir, "service.log")

  const childrenState = readChildren()
  const childPids = childrenState?.pids ?? []

  for (const childPid of childPids) {
    await killGracefully(childPid, logger, `child`)
  }

  await killGracefully(pid, logger, "daemon")

  // ponytail: confirm the daemon's WS port is genuinely free. After
  // SIGTERM/SIGKILL the kernel usually releases the port within ~50ms,
  // but TIME_WAIT or a stuck vite can hold it. A timeout here means
  // the next `start` will see "port in use" — surface that to the
  // operator so they don't have to wait until they re-run start to
  // discover the leftover.
  const portFree = await waitForPortFree(DEFAULT_PORT)

  removePidFile()
  removeTokenFile()
  removeRuntimeStateFile()
  removeChildrenFile()

  // ponytail: print any warn / error / fatal the daemon wrote during
  // its shutdown window BEFORE the success/failure line. On a clean
  // stop this is empty; on a SIGKILL escalation it surfaces the
  // daemon's last words ("vite didn't respond to SIGTERM within 5s")
  // without the operator having to read service.log.
  printDaemonEvents(readDaemonEventsFromSnapshot(logPath, snapshot))

  printStopComplete(portFree)

  if (!portFree) {
    // ponytail: the daemon process exited (the pid file is gone) but
    // the WS port is still bound. That's a TIME_WAIT or a stuck
    // orphan vite — log it as a warning but don't exit 1, since the
    // daemon IS stopped from a process-management perspective.
    logger.warn(
      { port: DEFAULT_PORT },
      "stop: daemon exited but port 52937 is still bound — check for orphans with `p dev status`",
    )
  }

  logger.info("stop: cleanup complete")
}

export default stop
