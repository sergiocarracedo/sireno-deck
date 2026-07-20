import { ChannelRegistry } from "sireno-deck/react"
import {
  helloMessageSchema,
  wsMessageSchema,
  type WsMessage,
} from "@/api/protocol"

export type ConnectionStatus = "connecting" | "open" | "closed" | "failed"

export interface WsClientOptions {
  url: string
  token?: string
  protocolVersion?: number
  onMessage?: (message: WsMessage) => void
  onStatus?: (status: ConnectionStatus) => void
  backoffMs?: ReadonlyArray<number>
  maxAttempts?: number
}

const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000]
const DEFAULT_MAX_ATTEMPTS = 10

export interface WsClient {
  connect(): void
  close(): void
  send(message: WsMessage): void
  subscribeChannels(channels: string[]): void
  getAttempt(): number
  getLastError(): string | null
}

export const createWsClient = (options: WsClientOptions): WsClient => {
  const {
    url,
    token,
    protocolVersion = 1,
    onMessage,
    onStatus,
    backoffMs = DEFAULT_BACKOFF,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  } = options

  let socket: WebSocket | null = null
  let attempt = 0
  let manuallyClosed = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let connected = false
  let lastError: string | null = null
  const pendingMessages: WsMessage[] = []
  const subscribedChannels = new Set<string>()

  const setStatus = (status: ConnectionStatus): void => onStatus?.(status)

  const flushPending = (): void => {
    while (
      pendingMessages.length > 0 &&
      socket?.readyState === WebSocket.OPEN
    ) {
      const msg = pendingMessages.shift()!
      socket.send(JSON.stringify(msg))
    }
  }

  const scheduleReconnect = (): void => {
    if (manuallyClosed) return
    if (attempt >= maxAttempts) {
      setStatus("failed")
      return
    }
    const delay = backoffMs[Math.min(attempt, backoffMs.length - 1)] ?? 30000
    attempt += 1
    timer = setTimeout(connect, delay)
  }

  const connect = (): void => {
    if (manuallyClosed) return
    setStatus("connecting")
    socket = new WebSocket(url)
    socket.addEventListener("open", () => {
      attempt = 0
      connected = true
      setStatus("open")
      const hello = helloMessageSchema.parse({
        type: "hello",
        version: protocolVersion,
        ...(token !== undefined ? { token } : {}),
      })
      socket?.send(JSON.stringify(hello))
      flushPending()
      if (subscribedChannels.size > 0) {
        const msg: WsMessage = {
          type: "subscribe-channels",
          channels: [...subscribedChannels],
        }
        socket?.send(JSON.stringify(msg))
      }
    })
    socket.addEventListener("message", (event: MessageEvent) => {
      try {
        const parsed = wsMessageSchema.safeParse(JSON.parse(String(event.data)))
        if (parsed.success) {
          onMessage?.(parsed.data)
          if (parsed.data.type === "state") {
            for (const [channel, payload] of Object.entries(
              parsed.data.channels,
            )) {
              ChannelRegistry.instance().publish(channel, payload)
            }
          }
        }
      } catch {
        // ignore invalid frames
      }
    })
    socket.addEventListener("close", () => {
      connected = false
      setStatus("closed")
      scheduleReconnect()
    })
    socket.addEventListener("error", () => {
      lastError = "WebSocket connection error"
      socket?.close()
    })
  }

  const close = (): void => {
    manuallyClosed = true
    connected = false
    pendingMessages.length = 0
    subscribedChannels.clear()
    if (timer !== null) clearTimeout(timer)
    if (socket === null) return
    if (socket.readyState === WebSocket.OPEN) {
      socket.close()
    }
  }

  const send = (message: WsMessage): void => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    } else {
      pendingMessages.push(message)
    }
  }

  const subscribeChannels = (channels: string[]): void => {
    const newChannels = channels.filter((ch) => !subscribedChannels.has(ch))
    if (newChannels.length === 0) return
    for (const ch of newChannels) subscribedChannels.add(ch)
    if (socket?.readyState === WebSocket.OPEN) {
      const msg: WsMessage = {
        type: "subscribe-channels",
        channels: newChannels,
      }
      socket.send(JSON.stringify(msg))
    }
  }

  return {
    connect,
    close,
    send,
    subscribeChannels,
    getAttempt: () => attempt,
    getLastError: () => lastError,
  }
}
