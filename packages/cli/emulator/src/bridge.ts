import {
  appendBridgeMessage,
  appendServiceLog,
  type ServiceLogLevel,
} from "./bridge-log-store"

export const WS_BACKOFF_DELAYS_MS = [
  1000, 2000, 4000, 8000, 16000, 30000,
] as const

export const WS_MAX_ATTEMPTS = 10

export const computeNextBackoff = (attempt: number): number => {
  if (attempt < 0) return WS_BACKOFF_DELAYS_MS[0]!
  if (attempt >= WS_BACKOFF_DELAYS_MS.length)
    return WS_BACKOFF_DELAYS_MS[WS_BACKOFF_DELAYS_MS.length - 1]!
  return WS_BACKOFF_DELAYS_MS[attempt]!
}

export interface WebSocketLike {
  send(data: string): void
  close(): void
  addEventListener?(name: string, cb: (event: unknown) => void): void
  removeEventListener?(name: string, cb: (event: unknown) => void): void
}

export interface WsClientOptions {
  readonly url: string
  readonly token?: string
  readonly onOpen?: () => void
  readonly onMessage?: (data: unknown) => void
  readonly onClose?: () => void
  readonly onFailed?: () => void
  readonly onStatus?: (status: WsStatus) => void
  readonly wsFactory?: (url: string) => WebSocketLike
}

export type WsStatus = "connecting" | "open" | "closed" | "failed"

export interface WsClient {
  send(data: string): void
  close(): void
  status(): WsStatus
  attemptCount(): number
  lastError(): string | null
}

export const createWsClient = (options: WsClientOptions): WsClient => {
  let status: WsStatus = "connecting"
  let attempts = 0
  let ws: WebSocketLike | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let closedByUser = false
  let lastErrorValue: string | null = null
  let openListener: ((event: unknown) => void) | null = null
  let closeListener: ((event: unknown) => void) | null = null
  const messageListeners: Array<(event: unknown) => void> = []

  const setStatus = (next: WsStatus): void => {
    status = next
    options.onStatus?.(next)
  }

  const scheduleReconnect = (): void => {
    if (closedByUser) return
    if (reconnectTimer !== null) clearTimeout(reconnectTimer)
    const delay = computeNextBackoff(Math.max(0, attempts - 1))
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      open()
    }, delay)
  }

  const onWsOpen = (event: unknown): void => {
    setStatus("open")
    options.onOpen?.()
    void event
  }

  const onWsClose = (event: unknown): void => {
    setStatus("closed")
    options.onClose?.()
    scheduleReconnect()
    void event
  }

  const onWsMessage = (event: unknown): void => {
    const data =
      event instanceof MessageEvent
        ? event.data
        : ((event as { data?: unknown })?.data ?? event)
    try {
      const parsed = JSON.parse(String(data)) as {
        type?: string
        channel?: unknown
        level?: string
        msg?: string
        ts?: number
      }
      appendBridgeMessage({
        ts: Date.now(),
        direction: "received",
        type: parsed.type ?? "unknown",
        channel: extractChannel(parsed),
        payload: parsed,
      })
      if (parsed.type === "service-log") {
        if (
          typeof parsed.msg === "string" &&
          typeof parsed.ts === "number" &&
          typeof parsed.level === "string"
        ) {
          appendServiceLog({
            ts: parsed.ts,
            level: parsed.level as ServiceLogLevel,
            msg: parsed.msg,
          })
        }
      }
    } catch {
      // ignore unparseable
    }
    options.onMessage?.(data)
  }

  const open = (): void => {
    if (closedByUser) return
    if (attempts >= WS_MAX_ATTEMPTS) {
      setStatus("failed")
      options.onFailed?.()
      return
    }
    attempts += 1
    const factory =
      options.wsFactory ??
      ((url: string) => new WebSocket(url) as unknown as WebSocketLike)
    const created = factory(options.url)
    if (created === null || created === undefined) {
      setStatus("failed")
      options.onFailed?.()
      return
    }
    ws = created
    setStatus("connecting")
    if (typeof created.addEventListener === "function") {
      openListener = onWsOpen
      closeListener = onWsClose
      const messageListener = onWsMessage
      const errorListener = (): void => {
        lastErrorValue = "WebSocket connection error"
        if (attempts >= WS_MAX_ATTEMPTS) setStatus("failed")
      }
      created.addEventListener("open", openListener)
      created.addEventListener("close", closeListener)
      created.addEventListener("message", messageListener)
      created.addEventListener("error", errorListener)
      messageListeners.push(messageListener)
    }
  }

  void open()

  const extractChannel = (parsed: {
    type?: string
    channel?: unknown
  }): string | null => {
    if (parsed.channel === undefined) return null
    if (typeof parsed.channel === "string") return parsed.channel
    return null
  }

  return {
    send(data) {
      try {
        const parsed = JSON.parse(data) as { type?: string; channel?: unknown }
        appendBridgeMessage({
          ts: Date.now(),
          direction: "sent",
          type: parsed.type ?? "unknown",
          channel: extractChannel(parsed),
          payload: parsed,
        })
        if (parsed.type === "service-log") {
          const e = parsed as {
            level?: string
            msg?: string
            ts?: number
          }
          if (
            typeof e.msg === "string" &&
            typeof e.ts === "number" &&
            typeof e.level === "string"
          ) {
            appendServiceLog({
              ts: e.ts,
              level: e.level as ServiceLogLevel,
              msg: e.msg,
            })
          }
        }
      } catch {
        // ignore unparseable
      }
      if (ws !== null && status === "open") ws.send(data)
    },
    close() {
      closedByUser = true
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (ws !== null && typeof ws.removeEventListener === "function") {
        if (openListener !== null) ws.removeEventListener("open", openListener)
        if (closeListener !== null)
          ws.removeEventListener("close", closeListener)
        for (const ml of messageListeners) ws.removeEventListener("message", ml)
      }
      ws?.close()
      setStatus("closed")
    },
    status: () => status,
    attemptCount: () => attempts,
    lastError: () => lastErrorValue,
  }
}

export const serializeHello = (token?: string): string => {
  return JSON.stringify({
    type: "hello",
    version: 1,
    ...(token !== undefined ? { token } : {}),
  })
}
