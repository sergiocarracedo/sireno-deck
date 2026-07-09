import { EventEmitter } from "node:events"

export type StreamDeckKeyEventType = "down" | "up"

export interface StreamDeckKeyEvent {
  readonly type: StreamDeckKeyEventType
  readonly keyIndex: number
  readonly timestamp: number
}

export interface VirtualStreamDeckOptions {
  readonly keyCount: number
  readonly autoTimestamp?: boolean
}

export interface VirtualStreamDeckLifecycle {
  getKeyCount(): number
  injectKeyEvent(event: StreamDeckKeyEvent): void
  injectKey(type: StreamDeckKeyEventType, keyIndex: number): void
  onKeyEvent(handler: (event: StreamDeckKeyEvent) => void): () => void
  clear(): void
}

export const createVirtualStreamDeckLifecycle = (
  options: VirtualStreamDeckOptions,
): VirtualStreamDeckLifecycle => {
  const emitter = new EventEmitter()
  const { autoTimestamp = true } = options

  const getKeyCount = (): number => options.keyCount

  const injectKeyEvent = (event: StreamDeckKeyEvent): void => {
    emitter.emit("key", event)
  }

  const injectKey = (type: StreamDeckKeyEventType, keyIndex: number): void => {
    if (keyIndex < 0 || keyIndex >= options.keyCount) {
      throw new Error(
        `injectKey: keyIndex ${keyIndex} out of range (0..${options.keyCount - 1})`,
      )
    }
    injectKeyEvent({
      type,
      keyIndex,
      timestamp: autoTimestamp ? Date.now() : 0,
    })
  }

  const onKeyEvent = (
    handler: (event: StreamDeckKeyEvent) => void,
  ): (() => void) => {
    emitter.on("key", handler)
    return () => emitter.off("key", handler)
  }

  const clear = (): void => {
    emitter.removeAllListeners("key")
  }

  return {
    getKeyCount,
    injectKeyEvent,
    injectKey,
    onKeyEvent,
    clear,
  }
}
