import type pino from "pino"

export type ProviderErrorCode =
  | "NOT_AVAILABLE"
  | "TIMEOUT"
  | "EXEC_FAILED"
  | "PARSE_ERROR"
  | "UNSUPPORTED_PLATFORM"

export class ProviderError extends Error {
  readonly code: ProviderErrorCode

  constructor(code: ProviderErrorCode, message: string) {
    super(message)
    this.name = "ProviderError"
    this.code = code
  }
}

export interface ActiveAppSnapshot {
  name: string
  windowTitle: string | null
  processId: number | null
}

export interface ActiveAppProvider {
  getActive(): Promise<ActiveAppSnapshot | null>
  subscribe(handler: (snapshot: ActiveAppSnapshot | null) => void): () => void
  stop(): Promise<void>
}

export type SessionState = "locked" | "unlocked" | "unknown"

export interface SessionProvider {
  getState(): SessionState
  subscribe(handler: (state: SessionState) => void): () => void
  stop(): Promise<void>
}

export interface KeyMacroProvider {
  sendKey(comboOrText: string): Promise<void>
  stop(): Promise<void>
}

export interface MediaMetadata {
  title: string
  artist: string | null
  album: string | null
  artUrl: string | null
}

export interface MediaProvider {
  play(): Promise<void>
  pause(): Promise<void>
  toggle(): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  getCurrent(): Promise<MediaMetadata | null>
  onChange(handler: (metadata: MediaMetadata | null) => void): () => void
  stop(): Promise<void>
}

export interface BrightnessReading {
  readonly value: number
  readonly max: number
}

export interface BrightnessProvider {
  getCurrent(): Promise<BrightnessReading>
  setBrightness(value: number): Promise<void>
  stop(): Promise<void>
}

export interface ClipboardProvider {
  writeText(text: string): Promise<void>
  readText(): Promise<string>
  stop(): Promise<void>
}

export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new ProviderError("TIMEOUT", `Operation timed out after ${ms}ms`))
    }, ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer !== null) clearTimeout(timer)
  }
}

const noopUnsubscribe = (): void => undefined

const logNull = (
  logger: pino.Logger | undefined,
  name: string,
  reason: string,
): void => {
  if (logger) {
    logger.warn(
      { provider: name, reason },
      "OS provider unavailable, using null provider",
    )
  }
}

export const createNullActiveAppProvider = (
  reason: string,
  logger?: pino.Logger,
): ActiveAppProvider => {
  logNull(logger, "active-app", reason)
  return {
    async getActive() {
      return null
    },
    subscribe() {
      return noopUnsubscribe
    },
    async stop() {
      return
    },
  }
}

export const createNullSessionProvider = (
  logger?: pino.Logger,
): SessionProvider => {
  if (logger) {
    logger.warn(
      { provider: "session" },
      "OS session provider unavailable, using null provider",
    )
  }
  return {
    getState() {
      return "unknown"
    },
    subscribe() {
      return noopUnsubscribe
    },
    async stop() {
      return
    },
  }
}

export const createNullKeyMacroProvider = (
  logger?: pino.Logger,
): KeyMacroProvider => {
  if (logger) {
    logger.warn(
      { provider: "key-macro" },
      "OS key-macro provider unavailable, sendKey will throw ProviderError",
    )
  }
  return {
    async sendKey(_comboOrText: string): Promise<void> {
      throw new ProviderError(
        "NOT_AVAILABLE",
        "Key-macro provider not available on this platform",
      )
    },
    async stop() {
      return
    },
  }
}

export const createNullBrightnessProvider = (
  logger?: pino.Logger,
): BrightnessProvider => {
  if (logger) {
    logger.warn(
      { provider: "brightness" },
      "OS brightness provider unavailable, using null provider",
    )
  }
  return {
    async getCurrent(): Promise<BrightnessReading> {
      return { value: 0, max: 100 }
    },
    async setBrightness(_value: number): Promise<void> {
      throw new ProviderError(
        "NOT_AVAILABLE",
        "Brightness provider not available on this platform",
      )
    },
    async stop() {
      return
    },
  }
}

export const createNullClipboardProvider = (
  logger?: pino.Logger,
): ClipboardProvider => {
  if (logger) {
    logger.warn(
      { provider: "clipboard" },
      "OS clipboard provider unavailable, using null provider",
    )
  }
  return {
    async writeText(_text: string): Promise<void> {
      throw new ProviderError(
        "NOT_AVAILABLE",
        "Clipboard provider not available on this platform",
      )
    },
    async readText(): Promise<string> {
      throw new ProviderError(
        "NOT_AVAILABLE",
        "Clipboard provider not available on this platform",
      )
    },
    async stop() {
      return
    },
  }
}

export const createNullMediaProvider = (
  logger?: pino.Logger,
): MediaProvider => {
  if (logger) {
    logger.warn(
      { provider: "media" },
      "OS media provider unavailable, using null provider",
    )
  }
  const notAvailable = async (): Promise<void> => {
    throw new ProviderError(
      "NOT_AVAILABLE",
      "Media provider not available on this platform",
    )
  }
  return {
    play: notAvailable,
    pause: notAvailable,
    toggle: notAvailable,
    next: notAvailable,
    previous: notAvailable,
    async getCurrent() {
      return null
    },
    onChange() {
      return noopUnsubscribe
    },
    async stop() {
      return
    },
  }
}
