import {
  getStreamDeckModelName,
  listStreamDecks,
  openStreamDeck,
  type StreamDeck as SdkDevice,
  type StreamDeckDeviceInfo,
} from "@elgato-stream-deck/node"

export class StreamDeckSelectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StreamDeckSelectionError"
  }
}

export type StreamDeckKeyEventType = "down" | "up"

export interface StreamDeckKeyEvent {
  readonly type: StreamDeckKeyEventType
  readonly keyIndex: number
  readonly timestamp: number
}

export interface StreamDeckDevice {
  readonly serial: string
  readonly path: string
  readonly model: string
  getKeyCount(): number
  setBrightness(value: number): Promise<void>
  fillKeyBuffer(keyIndex: number, buffer: Buffer): Promise<void>
  onKeyEvent(handler: (event: StreamDeckKeyEvent) => void): () => void
  /**
   * Fires when the SDK reports a transport failure — most commonly the USB
   * device going away (unplugged, or a KVM switching the host).
   *
   * ponytail: the SDK declares an `error` event and nothing subscribed to it.
   * An unhandled `error` on an EventEmitter throws, which the daemon's
   * uncaughtException guard turned into an immediate exit — so flipping a KVM
   * killed the service outright instead of it noticing the deck had left.
   */
  onError(handler: (err: unknown) => void): () => void
  close(): Promise<void>
}

export interface ConnectStreamDeckOptions {
  readonly serial?: string
  readonly path?: string
  readonly model?: string
}

const buildDescriptor = (
  info: StreamDeckDeviceInfo,
  controls: ReadonlyArray<SdkDevice["CONTROLS"][number]>,
) => ({
  serial: info.serialNumber ?? "",
  path: info.path,
  model: getStreamDeckModelName(info.model),
  keyCount: controls.filter((c) => c.type === "button").length,
})

export const connectStreamDeck = async (
  options: ConnectStreamDeckOptions = {},
): Promise<StreamDeckDevice> => {
  const infos = await listStreamDecks()
  let candidates: StreamDeckDeviceInfo[]
  if (infos.length === 0) {
    candidates = []
  } else if (
    options.serial !== undefined ||
    options.path !== undefined ||
    options.model !== undefined
  ) {
    candidates = infos.filter((info) => {
      if (options.serial !== undefined && info.serialNumber !== options.serial)
        return false
      if (options.path !== undefined && info.path !== options.path) return false
      if (options.model !== undefined && info.model !== options.model)
        return false
      return true
    })
  } else {
    candidates = [...infos]
  }

  if (candidates.length === 0) {
    throw new StreamDeckSelectionError(
      options.serial !== undefined || options.path !== undefined
        ? `No Stream Deck matches selector ${JSON.stringify(options)}`
        : "No Stream Deck devices found",
    )
  }
  if (
    candidates.length > 1 &&
    options.serial === undefined &&
    options.path === undefined
  ) {
    throw new StreamDeckSelectionError(
      `Multiple Stream Deck devices found (${candidates.length}); pass --serial or --path`,
    )
  }

  const targetInfo = candidates[0]!
  const handle = await openStreamDeck(targetInfo.path, {})
  const descriptor = buildDescriptor(targetInfo, handle.CONTROLS)

  // Baseline listener so the event always has a subscriber, even when the
  // caller never registers one. Without it an `error` emitted between open and
  // the caller's onError() call is still fatal.
  const errorHandlers = new Set<(err: unknown) => void>()
  handle.on("error", (err: unknown) => {
    for (const h of errorHandlers) h(err)
  })

  return {
    serial: descriptor.serial,
    path: descriptor.path,
    model: descriptor.model,
    getKeyCount: () => descriptor.keyCount,
    async setBrightness(value: number): Promise<void> {
      await handle.setBrightness(value)
    },
    async fillKeyBuffer(keyIndex: number, buffer: Buffer): Promise<void> {
      await handle.fillKeyBuffer(keyIndex, buffer)
    },
    onKeyEvent(handler: (event: StreamDeckKeyEvent) => void): () => void {
      const onDown = (control: { type: string; index: number }): void => {
        if (control.type !== "button") return
        handler({
          type: "down",
          keyIndex: control.index,
          timestamp: Date.now(),
        })
      }
      const onUp = (control: { type: string; index: number }): void => {
        if (control.type !== "button") return
        handler({ type: "up", keyIndex: control.index, timestamp: Date.now() })
      }
      handle.on("down", onDown)
      handle.on("up", onUp)
      return () => {
        handle.off("down", onDown)
        handle.off("up", onUp)
      }
    },
    onError(handler: (err: unknown) => void): () => void {
      errorHandlers.add(handler)
      return () => {
        errorHandlers.delete(handler)
      }
    },
    async close(): Promise<void> {
      await handle.close()
    },
  }
}
