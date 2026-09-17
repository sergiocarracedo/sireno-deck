import type pino from "pino"

import type { StreamDeckDevice, StreamDeckKeyEvent } from "./stream-deck"

/**
 * Wraps a Stream Deck so losing the hardware is a pause, not a crash.
 *
 * ponytail: a KVM switching to another computer removes the USB device. The
 * SDK then emits `error`, which nothing subscribed to — an unhandled `error`
 * on an EventEmitter throws, the daemon's uncaughtException guard fired, and
 * the service exited with no recovery. Writes could fail the same way.
 *
 * This keeps the daemon alive instead: the surrounding pipeline (vite,
 * Playwright, the bridge, the runtime) is untouched by USB coming and going,
 * so only the device handle is swapped. While the deck is away, writes are
 * dropped silently and a watcher retries for as long as it takes; when it
 * returns, brightness and key listeners are reattached and the caller is asked
 * to repaint.
 */
export interface ReconnectingDeviceDeps {
  readonly serial: string
  readonly connect: (opts: {
    readonly serial: string
  }) => Promise<StreamDeckDevice>
  readonly logger: pino.Logger
  /** Gap between reconnect attempts. */
  readonly retryDelayMs?: number
  /** Called after a fresh handle is attached, to restore brightness/repaint. */
  readonly onReconnect?: (device: StreamDeckDevice) => void | Promise<void>
  /** Called when the hardware goes away. */
  readonly onDisconnect?: (err: unknown) => void
  readonly sleep?: (ms: number) => Promise<void>
}

export interface ReconnectingDevice extends StreamDeckDevice {
  /** Whether hardware is attached right now. */
  isConnected(): boolean
}

const DEFAULT_RETRY_DELAY_MS = 2_000

export const createReconnectingDevice = (
  initial: StreamDeckDevice,
  deps: ReconnectingDeviceDeps,
): ReconnectingDevice => {
  const retryDelayMs = deps.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
  const sleep =
    deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))

  let current: StreamDeckDevice | null = initial
  let stopped = false
  let watching = false
  let detachCurrent: (() => void) | null = null

  const keyHandlers = new Set<(event: StreamDeckKeyEvent) => void>()
  const errorHandlers = new Set<(err: unknown) => void>()

  const attach = (device: StreamDeckDevice): void => {
    const offKeys = device.onKeyEvent((event) => {
      for (const h of keyHandlers) h(event)
    })
    const offError = device.onError((err) => {
      lose(err)
    })
    detachCurrent = () => {
      offKeys()
      offError()
    }
  }

  const lose = (err: unknown): void => {
    if (current === null || stopped) return
    const gone = current
    current = null
    detachCurrent?.()
    detachCurrent = null
    deps.logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "device: Stream Deck disconnected — holding the deck and watching for it to come back",
    )
    for (const h of errorHandlers) h(err)
    deps.onDisconnect?.(err)
    // Best effort: the handle is already dead, and close() on a vanished HID
    // device commonly throws.
    void Promise.resolve()
      .then(() => gone.close())
      .catch(() => undefined)
    void watch()
  }

  const watch = async (): Promise<void> => {
    if (watching || stopped) return
    watching = true
    let attempts = 0
    // Deliberately unbounded: the user asked for the deck to be picked up
    // whenever it returns, which on a KVM can be hours later. Nothing here
    // accumulates, and the daemon is otherwise idle without a device.
    while (!stopped && current === null) {
      attempts += 1
      try {
        const device = await deps.connect({ serial: deps.serial })
        if (stopped) {
          void device.close().catch(() => undefined)
          break
        }
        current = device
        attach(device)
        deps.logger.info(
          { attempts, serial: deps.serial },
          "device: Stream Deck reconnected",
        )
        try {
          await deps.onReconnect?.(device)
        } catch (err) {
          deps.logger.warn({ err }, "device: post-reconnect restore failed")
        }
        break
      } catch {
        // Not back yet. Logged sparsely so an overnight absence does not
        // produce thousands of identical lines.
        if (attempts === 1 || attempts % 30 === 0) {
          deps.logger.info(
            { attempts, serial: deps.serial, retryDelayMs },
            "device: still waiting for the Stream Deck",
          )
        }
        await sleep(retryDelayMs)
      }
    }
    watching = false
  }

  /** Runs a hardware call, treating transport failure as a disconnect. */
  const guard = async (
    action: (device: StreamDeckDevice) => Promise<void>,
  ): Promise<void> => {
    const device = current
    // No hardware: drop the write. The renderer keeps ticking against a device
    // that is not there, and its change tracker is reset on reconnect so the
    // dropped frames are repainted then.
    if (device === null) return
    try {
      await action(device)
    } catch (err) {
      lose(err)
    }
  }

  // Wire the device we were handed, not just the ones we reconnect to —
  // otherwise the first disconnect is never noticed and key events from the
  // initial handle never reach the caller.
  attach(initial)

  return {
    // Identity stays that of the device we were asked to track, so callers
    // that captured the descriptor keep working across a swap.
    serial: initial.serial,
    path: initial.path,
    model: initial.model,
    getKeyCount: () => (current ?? initial).getKeyCount(),
    isConnected: () => current !== null,
    async setBrightness(value: number): Promise<void> {
      await guard((d) => d.setBrightness(value))
    },
    async fillKeyBuffer(keyIndex: number, buffer: Buffer): Promise<void> {
      await guard((d) => d.fillKeyBuffer(keyIndex, buffer))
    },
    onKeyEvent(handler: (event: StreamDeckKeyEvent) => void): () => void {
      keyHandlers.add(handler)
      return () => {
        keyHandlers.delete(handler)
      }
    },
    onError(handler: (err: unknown) => void): () => void {
      errorHandlers.add(handler)
      return () => {
        errorHandlers.delete(handler)
      }
    },
    async close(): Promise<void> {
      stopped = true
      const device = current
      current = null
      detachCurrent?.()
      detachCurrent = null
      keyHandlers.clear()
      errorHandlers.clear()
      if (device !== null) await device.close()
    },
  }
}

export { DEFAULT_RETRY_DELAY_MS }
