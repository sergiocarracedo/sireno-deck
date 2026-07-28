import type { ChildProcess } from "node:child_process"

import type pino from "pino"

// ponytail: minimal retry helper. Watches a single child; on unexpected exit
// schedules a respawn after `delayMs`. After `maxRetries` respawn attempts,
// gives up via `onGiveUp`. Graceful shutdown (via stop() or isShuttingDown())
// suppresses both respawn and give-up — the parent is in control.
//
// Upgrade path: if we ever need exponential backoff or per-child policy, swap
// the linear `delayMs` for the WS_BACKOFF_DELAYS_MS table used by
// packages/cli/emulator/src/bridge.ts. Today a flat 60s × 2 retries is enough.
export interface SuperviseOptions {
  readonly label: string
  readonly spawn: () => Promise<ChildProcess>
  readonly onGiveUp: () => void
  readonly isShuttingDown: () => boolean
  readonly logger: pino.Logger
  readonly delayMs?: number
  readonly maxRetries?: number
  readonly kill?: (child: ChildProcess) => Promise<void>
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

export const supervise = async (
  options: SuperviseOptions,
): Promise<SuperviseHandle> => {
  const delayMs = options.delayMs ?? 60_000
  const maxRetries = options.maxRetries ?? 2
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
    }, delayMs)
  }

  const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
    if (stopped || options.isShuttingDown()) return
    options.logger.warn(
      { label: options.label, code, signal, retriesUsed },
      "subprocess exited unexpectedly",
    )
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
