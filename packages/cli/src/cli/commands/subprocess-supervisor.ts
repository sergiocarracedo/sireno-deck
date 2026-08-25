import type { ChildProcess } from "node:child_process"

import type pino from "pino"

// ponytail: incremental retry schedule for vite children + service-level
// supervision. 5 entries: 2s for transient blips, 60s tail for sticky failures.
// Total worst-case wallclock ~2 min before giving up. Replace the previous
// flat 60s × 2 retry which could take 3 min and never recovered from a brief
// fail without a 60s blank-period.
export const DEFAULT_VITE_RETRY_SCHEDULE_MS = [
  2_000, 5_000, 15_000, 30_000, 60_000,
] as const

export const DEFAULT_SERVICE_RETRY_SCHEDULE_MS = [
  2_000, 5_000, 15_000, 30_000, 60_000,
] as const

// ponytail: minimal retry helper. Watches a single child; on unexpected exit
// schedules a respawn after `delayScheduleMs[retriesUsed - 1]` (or `delayMs`
// for the flat schedule). After the schedule is exhausted, gives up via
// `onGiveUp`. Graceful shutdown (via stop() or isShuttingDown()) suppresses
// both respawn and give-up — the parent is in control.
//
// Two schedule modes:
//  - delayScheduleMs: incremental backoff. maxRetries defaults to the schedule's
//    length. Use this for transient-restart-friendly children (vite).
//  - delayMs + maxRetries: flat backoff. Kept for callers that don't need
//    varying delays. If both are set, delayScheduleMs wins.
export interface SuperviseOptions {
  readonly label: string
  readonly spawn: () => Promise<ChildProcess>
  readonly onGiveUp: () => void
  readonly isShuttingDown: () => boolean
  readonly logger: pino.Logger
  readonly delayScheduleMs?: ReadonlyArray<number>
  readonly delayMs?: number
  readonly maxRetries?: number
  readonly kill?: (child: ChildProcess) => Promise<void>
  /**
   * Called when the child exits unexpectedly — BEFORE the respawn timer is
   * scheduled. Awaited so the next respawn waits for the side effect (e.g.
   * black-frame push) to finish. Skipped when isShuttingDown() returns true.
   */
  readonly onChildExit?: (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => void | Promise<void>
}

export interface SuperviseHandle {
  readonly process: ChildProcess
  readonly stop: () => Promise<void>
}

const defaultKill = (child: ChildProcess): Promise<void> =>
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
    }, 2_000)
  })

const resolveDelay = (
  options: SuperviseOptions,
  retriesUsed: number,
): number => {
  if (options.delayScheduleMs !== undefined) {
    const schedule = options.delayScheduleMs
    if (schedule.length === 0) return options.delayMs ?? 60_000
    const idx = Math.min(retriesUsed - 1, schedule.length - 1)
    return schedule[idx] ?? schedule[schedule.length - 1] ?? 60_000
  }
  return options.delayMs ?? 60_000
}

const resolveMaxRetries = (options: SuperviseOptions): number => {
  if (options.delayScheduleMs !== undefined) {
    return options.maxRetries ?? options.delayScheduleMs.length
  }
  return options.maxRetries ?? 2
}

export const supervise = async (
  options: SuperviseOptions,
): Promise<SuperviseHandle> => {
  const maxRetries = resolveMaxRetries(options)
  const killChild = options.kill ?? defaultKill
  let stopped = false
  let respawnTimer: ReturnType<typeof setTimeout> | null = null
  let retriesUsed = 0
  let current: ChildProcess | null = null
  let initial: ChildProcess | null = null

  const clearTimer = (): void => {
    if (respawnTimer !== null) {
      clearTimeout(respawnTimer)
      respawnTimer = null
    }
  }

  const giveUp = (): void => {
    options.logger.fatal(
      {
        label: options.label,
        retriesUsed,
        maxRetries,
      },
      "subprocess exhausted retries — giving up",
    )
    stopped = true
    clearTimer()
    options.onGiveUp()
  }

  const scheduleRespawn = (): void => {
    const delay = resolveDelay(options, retriesUsed)
    respawnTimer = setTimeout(() => {
      respawnTimer = null
      if (stopped || options.isShuttingDown()) return
      void spawnAndWire().catch((err) => {
        options.logger.error(
          { err, label: options.label },
          "subprocess respawn failed",
        )
        giveUp()
      })
    }, delay)
  }

  const onExit = async (
    code: number | null,
    signal: NodeJS.Signals | null,
  ): Promise<void> => {
    if (stopped || options.isShuttingDown()) return
    options.logger.warn(
      { label: options.label, code, signal, retriesUsed },
      "subprocess exited unexpectedly",
    )
    if (options.onChildExit !== undefined) {
      try {
        await options.onChildExit(code, signal)
      } catch (err) {
        options.logger.error(
          { err, label: options.label },
          "subprocess onChildExit failed",
        )
      }
    }
    if (retriesUsed >= maxRetries) {
      giveUp()
      return
    }
    retriesUsed += 1
    scheduleRespawn()
  }

  const spawnAndWire = async (): Promise<ChildProcess> => {
    const child = await options.spawn()
    current = child
    child.once("exit", onExit)
    return child
  }

  initial = await spawnAndWire()

  return {
    get process(): ChildProcess {
      // Return the current mutable child so callers that capture the handle
      // after a respawn still see the live process. Falls back to the initial
      // child before the first spawn resolves (defensive — shouldn't happen).
      return current ?? initial ?? (undefined as unknown as ChildProcess)
    },
    stop: async (): Promise<void> => {
      stopped = true
      clearTimer()
      const target = current ?? initial
      if (target === null) return
      await killChild(target)
    },
  }
}
