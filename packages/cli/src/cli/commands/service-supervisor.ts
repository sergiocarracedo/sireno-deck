import type { ChildProcess } from "node:child_process"

import type pino from "pino"

import { pushBlackFrameToDevice } from "@/device/black-frame"
import {
  removeChildrenFile,
  removePidFile,
  removeStartLock,
  removeTokenFile,
  writePid,
} from "@/util/daemon"
import { loadDeviceConfig } from "@/util/device-config"

import {
  DEFAULT_SERVICE_RETRY_SCHEDULE_MS,
  supervise,
  type SuperviseHandle,
} from "./subprocess-supervisor"
import { spawnDetached } from "./spawn-daemon"

// ponytail: parent-of-service supervisor for dev mode (`forkOffDev`).
// Production goes through systemd/launchd — Restart=always + RestartSec=5
// already handles that path. In dev mode the parent IS the supervisor, so:
//  - watch the daemon child
//  - on unexpected exit: push black frame once (idempotent), terminate
//    tracked children, retry the daemon with the same schedule the
//    subprocess-supervisor uses for vite
//  - on give-up: clean runtime dir, exit 1
//
// The supervisor wraps the existing `supervise()` primitive so the retry
// state machine and respawn logic stay in one place. Black-frame idempotency
// is local — retries call `onChildExit` once per crash, but the flag
// ensures we push exactly once per "crash chain" (respawns don't repush).
export interface ServiceSupervisorOptions {
  readonly xdgConfigHome: string
  readonly logger: pino.Logger
  readonly args: ReadonlyArray<string>
  readonly delayScheduleMs?: ReadonlyArray<number>
  /**
   * Called after the retry budget is exhausted. Caller is responsible for
   * process.exit — the supervisor only clears the runtime dir. Awaited
   * before the parent exits.
   */
  readonly onGiveUp: () => Promise<void> | void
  /**
   * Called when the parent receives SIGINT/SIGTERM. If undefined, default
   * forwarding to the child via SIGTERM is applied. The parent process
   * itself stays alive until the child exits (so the runtime dir cleanup
   * runs cleanly).
   */
  readonly onSignal?: (signal: NodeJS.Signals) => void
}

export interface ServiceSupervisorHandle {
  readonly pid: number
  readonly stop: () => Promise<void>
}

const resolveBinPath = (): string => process.argv[1] ?? process.execPath

const killDefault = (child: ChildProcess): Promise<void> =>
  new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }
    let killTimer: ReturnType<typeof setTimeout> | null = null
    child.once("exit", () => {
      if (killTimer !== null) clearTimeout(killTimer)
      resolve()
    })
    try {
      child.kill("SIGTERM")
    } catch {
      if (killTimer !== null) clearTimeout(killTimer)
      resolve()
      return
    }
    killTimer = setTimeout(() => {
      killTimer = null
      if (child.exitCode === null && child.signalCode === null) {
        try {
          child.kill("SIGKILL")
        } catch {
          // already gone
        }
      }
    }, 5_000)
  })

export const superviseService = async (
  options: ServiceSupervisorOptions,
): Promise<ServiceSupervisorHandle> => {
  const { logger } = options
  const binPath = resolveBinPath()
  let blackFramePushed = false
  let shuttingDown = false

  const pushBlackOnce = async (): Promise<void> => {
    if (blackFramePushed) return
    blackFramePushed = true
    const cfg = loadDeviceConfig({ xdgConfigHome: options.xdgConfigHome })
    if (cfg === null) {
      logger.debug("parent: no saved device config, skipping black frame")
      return
    }
    await pushBlackFrameToDevice({ serial: cfg.serial }, logger)
  }

  const onSignal = (signal: NodeJS.Signals): void => {
    shuttingDown = true
    options.onSignal?.(signal)
    if (
      handle.process.exitCode === null &&
      handle.process.signalCode === null
    ) {
      try {
        handle.process.kill("SIGTERM")
      } catch {
        // already gone
      }
    }
  }
  const sigintHandler = (): void => onSignal("SIGINT")
  const sigtermHandler = (): void => onSignal("SIGTERM")
  process.once("SIGINT", sigintHandler)
  process.once("SIGTERM", sigtermHandler)

  const handle: SuperviseHandle = await supervise({
    label: "service",
    delayScheduleMs:
      options.delayScheduleMs ?? DEFAULT_SERVICE_RETRY_SCHEDULE_MS,
    kill: killDefault,
    spawn: async () => {
      const { pid, child } = spawnDetached({
        binPath,
        args: options.args,
        devMode: true,
      })
      if (pid <= 0) {
        throw new Error("service-supervisor: failed to spawn daemon (no pid)")
      }
      writePid(pid)
      logger.info(
        { childPid: pid, configPath: options.args },
        "parent: daemon spawned",
      )
      return child
    },
    onChildExit: async (code, signal) => {
      // ponytail: clean shutdown — code 0 or a graceful signal means the daemon
      // exited on purpose (pipeline's `process.exit(0)`, or an external
      // SIGTERM/SIGINT/SIGHUP). The daemon already cleared its screen on the
      // way out (black-frame push in the pipeline's `finally`), so don't
      // re-push, don't burn the retry schedule on a successful run, and don't
      // pretend it was unexpected. Exit the parent so `pnpm dev` returns
      // control to the terminal instead of hanging through the
      // 2s/5s/15s/30s/60s schedule before process.exit(1).
      const graceful =
        code === 0 ||
        signal === "SIGTERM" ||
        signal === "SIGINT" ||
        signal === "SIGHUP"
      if (graceful) {
        logger.info({ code, signal }, "parent: service exited cleanly")
        removePidFile()
        removeTokenFile()
        removeChildrenFile()
        removeStartLock()
        process.removeListener("SIGINT", sigintHandler)
        process.removeListener("SIGTERM", sigtermHandler)
        process.exit(code ?? 0)
        return
      }
      logger.warn({ code, signal }, "parent: service exited unexpectedly")
      await pushBlackOnce()
    },
    onGiveUp: () => {
      logger.fatal("parent: service exhausted retries, exiting")
      removePidFile()
      removeTokenFile()
      removeChildrenFile()
      removeStartLock()
      process.removeListener("SIGINT", sigintHandler)
      process.removeListener("SIGTERM", sigtermHandler)
      void Promise.resolve(options.onGiveUp()).finally(() => {
        process.exit(1)
      })
    },
    isShuttingDown: () => shuttingDown,
    logger,
  })

  return {
    pid: handle.process.pid ?? -1,
    stop: async (): Promise<void> => {
      shuttingDown = true
      process.removeListener("SIGINT", sigintHandler)
      process.removeListener("SIGTERM", sigtermHandler)
      await handle.stop()
    },
  }
}
