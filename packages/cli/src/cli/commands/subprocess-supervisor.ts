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
}

export interface SuperviseHandle {
  readonly process: ChildProcess
  readonly stop: () => void
}

export const supervise = async (
  options: SuperviseOptions,
): Promise<SuperviseHandle> => {
  const delayMs = options.delayMs ?? 60_000
  const maxRetries = options.maxRetries ?? 2
  let stopped = false
  let respawnTimer: ReturnType<typeof setTimeout> | null = null
  let retriesUsed = 0
  let current: ChildProcess | null = null

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

  const initial = await spawnAndWire()
  return {
    process: initial,
    stop: () => {
      stopped = true
      clearTimer()
      void current
    },
  }
}
