import type { Server as HttpServer } from "node:http"
import { WebSocketServer, type WebSocket } from "ws"

import type { DeviceDescriptor } from "@/device/registry"
import { createLogger, type Logger } from "@/util/logger"
import {
  PROTOCOL_VERSION,
  helloAckMessageSchema,
  helloMessageSchema,
  helloMessageStrictSchema,
  wsMessageSchema,
  type WsMessage,
} from "./protocol"
import type { AddonsInventoryMessage } from "@/api/protocol-internal"

const HANDSHAKE_TIMEOUT_MS = 5000
const TOKEN_MISMATCH_CLOSE_CODE = 4001

export interface WsBridgeOptions {
  port?: number
  host?: string
  expectedToken?: string
  handshakeTimeoutMs?: number
  activeTheme?: { name: string; version?: number }
  logger?: Logger
  // ponytail: when provided, sent as a follow-up to hello-ack so the
  // emulator's Addons tab can render without needing a separate HTTP
  // fetch (which doesn't exist in --emulator mode).
  addonInventory?: AddonsInventoryMessage["addons"]
}

export interface WsBridge {
  readonly port: number
  readonly url: string
  setDevice(device: DeviceDescriptor): void
  // ponytail: late-bound so callers can ship addon inventory after
  // external addons register (e.g. buildExternalScannedAddons runs
  // after the bridge starts in runPipeline). Subsequent connects get
  // the new value; already-connected clients aren't resent (would be
  // redundant — the page is mounting fresh anyway).
  setAddonInventory(inventory: AddonsInventoryMessage["addons"]): void
  broadcast(message: WsMessage): void
  sendToCaller(message: WsMessage): void
  registerCacheablePoller(
    channel: string,
    pollFn: () => unknown | Promise<unknown>,
  ): void
  onMessage(handler: (message: WsMessage, socket: WebSocket) => void): void
  onConnection(handler: (socket: WebSocket) => void): void
  close(): Promise<void>
}

export const startWsBridge = (
  options: WsBridgeOptions = {},
): Promise<WsBridge> => {
  const {
    port = 0,
    host = "127.0.0.1",
    expectedToken,
    handshakeTimeoutMs = HANDSHAKE_TIMEOUT_MS,
    activeTheme,
    logger = createLogger({ level: "warn", component: "ws-bridge" }),
  } = options
  let { addonInventory } = options

  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port, host })

    const messageHandlers: Array<
      (message: WsMessage, socket: WebSocket) => void
    > = []
    const connectionHandlers: Array<(socket: WebSocket) => void> = []
    const lastChannels: Record<string, unknown> = {}
    const cacheablePollers = new Map<string, () => unknown | Promise<unknown>>()
    const pendingChannelSubs = new Map<string, Set<WebSocket>>()
    let currentDevice: DeviceDescriptor | null = null

    const sendToSocket = (socket: WebSocket, message: WsMessage): void => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message))
      }
    }

    wss.on("connection", (socket: WebSocket) => {
      let handshakeDone = false

      const handshakeTimer = setTimeout(() => {
        if (!handshakeDone) {
          logger.warn(
            { peer: socket.remoteAddress ?? "unknown" },
            "ws handshake timed out",
          )
          socket.close(4000, "handshake timeout")
        }
      }, handshakeTimeoutMs)

      socket.on("message", (raw) => {
        let parsed: unknown
        try {
          parsed = JSON.parse(raw.toString())
        } catch (err) {
          logger.warn(
            { reason: err instanceof Error ? err.message : String(err) },
            "ws message: invalid json",
          )
          socket.close(4002, "invalid json")
          return
        }
        const result = wsMessageSchema.safeParse(parsed)
        if (!result.success) {
          logger.warn(
            { issues: result.error.issues },
            "ws message: schema mismatch",
          )
          socket.close(4003, "invalid message")
          return
        }
        const message = result.data
        if (!handshakeDone) {
          if (message.type !== "hello") {
            socket.close(4004, "expected hello")
            return
          }
          const helloSchema =
            expectedToken !== undefined
              ? helloMessageStrictSchema
              : helloMessageSchema
          const helloResult = helloSchema.safeParse(message)
          if (!helloResult.success) {
            socket.close(4001, "invalid hello")
            return
          }
          if (
            expectedToken !== undefined &&
            helloResult.data.token !== expectedToken
          ) {
            socket.close(TOKEN_MISMATCH_CLOSE_CODE, "token mismatch")
            return
          }
          handshakeDone = true
          clearTimeout(handshakeTimer)
          const ack = helloAckMessageSchema.parse({
            type: "hello-ack",
            version: PROTOCOL_VERSION,
            ...(currentDevice !== null ? { device: currentDevice } : {}),
            config:
              activeTheme !== undefined ? { theme: activeTheme.name } : {},
          })
          socket.send(JSON.stringify(ack))
          if (currentDevice !== null) {
            sendToSocket(socket, { type: "device-info", device: currentDevice })
          }
          if (addonInventory !== undefined) {
            sendToSocket(socket, {
              type: "addons-inventory",
              addons: addonInventory,
            })
          }
          for (const handler of connectionHandlers) handler(socket)
          return
        }

        if (message.type === "subscribe-channels") {
          const cached: Record<string, unknown> = {}
          const uncached: string[] = []
          for (const channel of message.channels) {
            if (channel in lastChannels) {
              cached[channel] = lastChannels[channel]
            } else if (cacheablePollers.has(channel)) {
              uncached.push(channel)
            } else {
              let waiting = pendingChannelSubs.get(channel)
              if (waiting === undefined) {
                waiting = new Set()
                pendingChannelSubs.set(channel, waiting)
              }
              waiting.add(socket)
            }
          }
          if (Object.keys(cached).length > 0) {
            sendToSocket(socket, { type: "state", channels: cached })
          }
          for (const channel of uncached) {
            const pollFn = cacheablePollers.get(channel)
            if (pollFn === undefined) continue
            void Promise.resolve(pollFn())
              .then((value) => {
                const msg: WsMessage = {
                  type: "state",
                  channels: { [channel]: value },
                }
                const payload = JSON.stringify(msg)
                for (const client of wss.clients) {
                  if (client.readyState === client.OPEN) client.send(payload)
                }
              })
              .catch(() => {
                // poll on demand failed — ignore, next interval will retry
              })
          }
          return
        }

        for (const handler of messageHandlers) handler(message, socket)
      })

      socket.on("error", () => {
        clearTimeout(handshakeTimer)
      })

      socket.on("close", () => {
        for (const subs of pendingChannelSubs.values()) {
          subs.delete(socket)
        }
      })
    })

    wss.on("listening", () => {
      const addr = wss.address()
      if (addr === null || typeof addr === "string") {
        reject(new Error("ws bridge: invalid address"))
        return
      }
      const port = addr.port
      const url = `ws://127.0.0.1:${port}`
      const bridge: WsBridge = {
        port,
        url,
        setDevice: (device) => {
          currentDevice = device
          const msg: WsMessage = { type: "device-info", device }
          const payload = JSON.stringify(msg)
          for (const client of wss.clients) {
            if (client.readyState === client.OPEN) client.send(payload)
          }
        },
        setAddonInventory: (inventory) => {
          addonInventory = inventory
        },
        broadcast: (message) => {
          if (message.type === "state") {
            Object.assign(lastChannels, message.channels)
          }
          const payload = JSON.stringify(message)
          for (const client of wss.clients) {
            if (client.readyState === client.OPEN) client.send(payload)
          }
        },
        sendToCaller: (message) => {
          for (const client of wss.clients) {
            if (client.readyState === client.OPEN)
              client.send(JSON.stringify(message))
          }
        },
        registerCacheablePoller: (channel, pollFn) => {
          cacheablePollers.set(channel, pollFn)
          const waiting = pendingChannelSubs.get(channel)
          if (waiting !== undefined) {
            pendingChannelSubs.delete(channel)
            // ponytail: poll once and broadcast to every waiting socket. The
            // legacy loop fired the probe N times for N sockets — the cache
            // exists to avoid that exact amplification.
            void Promise.resolve(pollFn())
              .then((value) => {
                const msg: WsMessage = {
                  type: "state",
                  channels: { [channel]: value },
                }
                for (const sock of waiting) sendToSocket(sock, msg)
                lastChannels[channel] = value
              })
              .catch(() => {
                // poll on demand failed — ignore, next interval will retry
              })
          }
        },
        onMessage: (handler) => messageHandlers.push(handler),
        onConnection: (handler) => connectionHandlers.push(handler),
        close: () =>
          new Promise<void>((res) => {
            pendingChannelSubs.clear()
            for (const client of wss.clients) client.close(1000)
            wss.close(() => res())
          }),
      }
      resolve(bridge)
    })

    wss.on("error", (err) => reject(err))
  })
}

export type WsBridgeHttpServer = HttpServer
