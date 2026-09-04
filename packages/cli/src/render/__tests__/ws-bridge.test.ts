import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import WebSocket from "ws"

import {
  PROTOCOL_VERSION,
  buttonActionMessageSchema,
  helloAckMessageSchema,
  stateMessageSchema,
  editorMutationMessageSchema,
} from "../protocol"
import { startWsBridge, type WsBridge } from "../ws-bridge"

let bridge: WsBridge | null = null

afterEach(async () => {
  if (bridge !== null) {
    await bridge.close()
    bridge = null
  }
  vi.useRealTimers()
})

const openClient = (port: number, token?: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "hello",
          version: PROTOCOL_VERSION,
          ...(token !== undefined ? { token } : {}),
        }),
      )
      resolve(socket)
    })
    socket.on("error", reject)
  })

describe("ws bridge", () => {
  it("starts on 127.0.0.1 with random port", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    expect(bridge.port).toBeGreaterThan(0)
    expect(bridge.url).toBe(`ws://127.0.0.1:${bridge.port}`)
  })

  it("completes handshake with hello + sends hello-ack with device", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    bridge.setDevice({
      id: "SN1",
      model: "mk2",
      keyCount: 15,
      label: "MK.2 (SN1)",
      transport: "real",
    })
    const socket = await openClient(bridge.port)
    const ack = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        resolve(parsed)
        socket.close()
      })
    })
    const result = helloAckMessageSchema.safeParse(ack)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.device).toEqual({
        id: "SN1",
        model: "mk2",
        keyCount: 15,
        label: "MK.2 (SN1)",
        transport: "real",
      })
    }
  })

  it("reconnects with the refreshed theme metadata", async () => {
    bridge = await startWsBridge({
      expectedToken: "",
      activeTheme: { name: "default" },
    })
    bridge.setActiveTheme?.({ name: "dark", version: 2 })
    const socket = await openClient(bridge.port)
    const ack = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "hello-ack") resolve(parsed)
      })
      setTimeout(() => resolve(null), 200)
    })
    expect(ack).toMatchObject({ config: { theme: "dark" } })
    socket.close()
  })

  it("setDevice broadcasts device-info to connected clients", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const socket = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    const received: unknown[] = []
    socket.on("message", (raw) => {
      const parsed = JSON.parse(raw.toString())
      if (parsed.type === "device-info") received.push(parsed)
    })
    bridge.setDevice({
      id: "emulator:mk2",
      model: "mk2",
      keyCount: 15,
      label: "Emulator MK.2",
      transport: "emulated",
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(received).toHaveLength(1)
    expect((received[0] as { device: { id: string } }).device.id).toBe(
      "emulator:mk2",
    )
    socket.close()
  })

  it("closes with 4001 on token mismatch", async () => {
    bridge = await startWsBridge({ expectedToken: "secret" })
    const code = await new Promise<number>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${bridge!.port}`)
      socket.on("open", () => {
        socket.send(
          JSON.stringify({
            type: "hello",
            version: PROTOCOL_VERSION,
            token: "wrong",
          }),
        )
      })
      socket.on("close", (code) => resolve(code))
      socket.on("error", reject)
    })
    expect(code).toBe(4001)
  })

  it("broadcast sends to all connected clients", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const a = await openClient(bridge.port)
    const b = await openClient(bridge.port)
    const received: unknown[] = []
    const handler = (raw: WebSocket.RawData) => {
      const parsed = JSON.parse(raw.toString())
      if (parsed.type === "state") received.push(parsed)
    }
    a.on("message", handler)
    b.on("message", handler)
    await new Promise((r) => setTimeout(r, 30))
    const msg = stateMessageSchema.parse({
      type: "state",
      channels: { cpu: { usage: 0.5 } },
    })
    bridge.broadcast(msg)
    await new Promise((r) => setTimeout(r, 30))
    expect(received.length).toBe(2)
    a.close()
    b.close()
  })

  it("onMessage receives button-action after handshake", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const handler = new Promise<unknown>((resolve) => {
      bridge!.onMessage((message) => resolve(message))
      openClient(bridge!.port).then((s) => {
        setTimeout(() => {
          s.send(
            JSON.stringify(
              buttonActionMessageSchema.parse({
                type: "button-action",
                deckId: "main",
                position: 0,
                gesture: "tap",
              }),
            ),
          )
        }, 50)
      })
    })
    const msg = await handler
    expect((msg as { type: string }).type).toBe("button-action")
  })

  it("onMessage receives editor mutations after handshake", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const received = new Promise<unknown>((resolve) => {
      bridge!.onMessage((message) => resolve(message))
      openClient(bridge!.port).then((s) => {
        s.send(
          JSON.stringify(
            editorMutationMessageSchema.parse({
              type: "editor-mutate",
              requestId: "r1",
              revision: 0,
              mutation: { kind: "delete", deckId: "main", index: 0 },
            }),
          ),
        )
      })
    })
    await expect(received).resolves.toMatchObject({
      type: "editor-mutate",
      requestId: "r1",
    })
  })

  it("onConnection fires after hello", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const connPromise = new Promise<boolean>((resolve) => {
      bridge!.onConnection(() => resolve(true))
    })
    await openClient(bridge.port)
    const ok = await Promise.race([
      connPromise,
      new Promise<boolean>((r) => setTimeout(() => r(false), 200)),
    ])
    expect(ok).toBe(true)
  })

  it("rejects invalid json with 4002", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const code = await new Promise<number>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${bridge!.port}`)
      socket.on("open", () => socket.send("not-json"))
      socket.on("close", (c) => resolve(c))
      socket.on("error", reject)
    })
    expect(code).toBe(4002)
  })

  it("close stops the server", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const port = bridge.port
    await bridge.close()
    bridge = null
    const stillUp = await new Promise<boolean>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}`)
      socket.on("error", () => resolve(false))
      socket.on("open", () => {
        socket.close()
        resolve(true)
      })
      setTimeout(() => resolve(false), 200)
    })
    expect(stillUp).toBe(false)
  })
})

describe("ws bridge channel cache", () => {
  it("broadcast of state message caches channels for new clients", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    bridge.broadcast({ type: "state", channels: { cpu: { usage: 0.5 } } })
    const socket = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["cpu"] }),
    )
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed)
      })
      setTimeout(() => resolve(null), 200)
    })
    expect(reply).toEqual({ type: "state", channels: { cpu: { usage: 0.5 } } })
    socket.close()
  })

  it("consecutive broadcasts merge channels without dropping others", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    bridge.broadcast({ type: "state", channels: { a: 1, b: 2 } })
    bridge.broadcast({ type: "state", channels: { a: 2 } })
    const socket = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["a", "b"] }),
    )
    const reply = await new Promise<Record<string, unknown>>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed as Record<string, unknown>)
      })
      setTimeout(() => resolve({}), 200)
    })
    expect(reply.channels).toEqual({ a: 2, b: 2 })
    socket.close()
  })

  it("non-state broadcasts do not touch channel cache", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    bridge.broadcast({ type: "state", channels: { cpu: 1 } })
    bridge.broadcast({
      type: "deck-config",
      deckId: "main",
      surfaces: {},
    } as unknown as Parameters<typeof bridge.broadcast>[0])
    const socket = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["cpu"] }),
    )
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed)
      })
      setTimeout(() => resolve(null), 200)
    })
    expect(reply).toEqual({ type: "state", channels: { cpu: 1 } })
    socket.close()
  })

  it("subscribe-channels replies only to the requesting socket", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    bridge.broadcast({ type: "state", channels: { shared: 1 } })
    const a = await openClient(bridge.port)
    const b = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    let bReceived = false
    b.on("message", (raw) => {
      const parsed = JSON.parse(raw.toString())
      if (parsed.type === "state") bReceived = true
    })
    a.send(JSON.stringify({ type: "subscribe-channels", channels: ["shared"] }))
    await new Promise((r) => setTimeout(r, 50))
    expect(bReceived).toBe(false)
    a.close()
    b.close()
  })

  it("subscribe-channels queues pending until poller registers, then replies", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const socket = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["unknown"] }),
    )
    const noReplyYet = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed)
      })
      setTimeout(() => resolve(null), 80)
    })
    expect(noReplyYet).toBeNull()
    bridge.registerCacheablePoller("unknown", () => ({ value: 42 }))
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed)
      })
      setTimeout(() => resolve(null), 200)
    })
    expect(reply).toEqual({
      type: "state",
      channels: { unknown: { value: 42 } },
    })
    socket.close()
  })

  it("subscribe-channels invokes registered pollFn for uncached channels", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const pollFn = vi.fn(() => ({ temp: 22 }))
    bridge.registerCacheablePoller("weather:current", pollFn)
    const socket = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socket.send(
      JSON.stringify({
        type: "subscribe-channels",
        channels: ["weather:current"],
      }),
    )
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed)
      })
      setTimeout(() => resolve(null), 200)
    })
    expect(pollFn).toHaveBeenCalledTimes(1)
    expect(reply).toEqual({
      type: "state",
      channels: { "weather:current": { temp: 22 } },
    })
    socket.close()
  })

  it("subscribe-channels serves cached values without invoking pollFn", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const pollFn = vi.fn(() => ({ temp: 22 }))
    bridge.registerCacheablePoller("weather:current", pollFn)
    bridge.broadcast({
      type: "state",
      channels: { "weather:current": { temp: 20 } },
    })
    const socket = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socket.send(
      JSON.stringify({
        type: "subscribe-channels",
        channels: ["weather:current"],
      }),
    )
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed)
      })
      setTimeout(() => resolve(null), 200)
    })
    expect(pollFn).not.toHaveBeenCalled()
    expect(reply).toEqual({
      type: "state",
      channels: { "weather:current": { temp: 20 } },
    })
    socket.close()
  })

  it("pending reply populates lastChannels for a later subscriber", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const pollFn = vi.fn(() => ({ temp: 22 }))
    const socketA = await openClient(bridge.port)
    const socketB = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 50))
    socketA.send(
      JSON.stringify({
        type: "subscribe-channels",
        channels: ["pending:test"],
      }),
    )
    await new Promise((r) => setTimeout(r, 100))
    const replyAPromise = new Promise<unknown>((resolve) => {
      socketA.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed)
      })
      setTimeout(() => resolve(null), 500)
    })
    bridge.registerCacheablePoller("pending:test", pollFn)
    const replyA = await replyAPromise
    expect(replyA).toEqual({
      type: "state",
      channels: { "pending:test": { temp: 22 } },
    })
    expect(pollFn).toHaveBeenCalledTimes(1)
    socketB.send(
      JSON.stringify({
        type: "subscribe-channels",
        channels: ["pending:test"],
      }),
    )
    const replyB = await new Promise<unknown>((resolve) => {
      socketB.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString())
        if (parsed.type === "state") resolve(parsed)
      })
      setTimeout(() => resolve(null), 300)
    })
    expect(replyB).toEqual({
      type: "state",
      channels: { "pending:test": { temp: 22 } },
    })
    expect(pollFn).toHaveBeenCalledTimes(1)
    socketA.close()
    socketB.close()
  })

  it("two sockets waiting for the same channel each get the reply", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const socketA = await openClient(bridge.port)
    const socketB = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socketA.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["dual:wait"] }),
    )
    socketB.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["dual:wait"] }),
    )
    await new Promise((r) => setTimeout(r, 30))
    bridge.registerCacheablePoller("dual:wait", () => ({ ready: true }))
    const [replyA, replyB] = await Promise.all([
      new Promise<unknown>((resolve) => {
        socketA.on("message", (raw) => {
          const parsed = JSON.parse(raw.toString())
          if (parsed.type === "state") resolve(parsed)
        })
        setTimeout(() => resolve(null), 200)
      }),
      new Promise<unknown>((resolve) => {
        socketB.on("message", (raw) => {
          const parsed = JSON.parse(raw.toString())
          if (parsed.type === "state") resolve(parsed)
        })
        setTimeout(() => resolve(null), 200)
      }),
    ])
    expect(replyA).toEqual({
      type: "state",
      channels: { "dual:wait": { ready: true } },
    })
    expect(replyB).toEqual({
      type: "state",
      channels: { "dual:wait": { ready: true } },
    })
    socketA.close()
    socketB.close()
  })

  it("pending reply is targeted, not broadcast", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const socketA = await openClient(bridge.port)
    const socketB = await openClient(bridge.port)
    const socketC = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socketA.send(
      JSON.stringify({
        type: "subscribe-channels",
        channels: ["targeted:chan"],
      }),
    )
    socketB.send(
      JSON.stringify({
        type: "subscribe-channels",
        channels: ["targeted:chan"],
      }),
    )
    await new Promise((r) => setTimeout(r, 30))
    bridge.registerCacheablePoller("targeted:chan", () => ({ targeted: true }))
    const [, , replyC] = await Promise.all([
      new Promise<unknown>((resolve) => {
        socketA.on("message", (raw) => {
          const parsed = JSON.parse(raw.toString())
          if (parsed.type === "state") resolve(parsed)
        })
        setTimeout(() => resolve(null), 200)
      }),
      new Promise<unknown>((resolve) => {
        socketB.on("message", (raw) => {
          const parsed = JSON.parse(raw.toString())
          if (parsed.type === "state") resolve(parsed)
        })
        setTimeout(() => resolve(null), 200)
      }),
      new Promise<unknown>((resolve) => {
        socketC.on("message", (raw) => {
          const parsed = JSON.parse(raw.toString())
          if (parsed.type === "state") resolve(parsed)
        })
        setTimeout(() => resolve(null), 200)
      }),
    ])
    expect(replyC).toBeNull()
    socketA.close()
    socketB.close()
    socketC.close()
  })

  it("closing the socket removes it from pending-subs", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const socketA = await openClient(bridge.port)
    const socketB = await openClient(bridge.port)
    await new Promise((r) => setTimeout(r, 30))
    socketA.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["dead:socket"] }),
    )
    await new Promise((r) => setTimeout(r, 30))
    socketA.close()
    let pollCallCount = 0
    bridge.registerCacheablePoller("dead:socket", () => {
      pollCallCount++
      return { count: pollCallCount }
    })
    await new Promise((r) => setTimeout(r, 200))
    expect(pollCallCount).toBe(1)
    socketB.close()
  })

  it("registerCacheablePoller with no pending subs is a no-op", async () => {
    bridge = await startWsBridge({ expectedToken: "" })
    const pollFn = vi.fn(() => ({ solo: true }))
    bridge.registerCacheablePoller("solo:chan", pollFn)
    await new Promise((r) => setTimeout(r, 100))
    expect(pollFn).not.toHaveBeenCalled()
  })
})

describe("unused", () => {
  it("beforeEach noop", () => {
    expect(true).toBe(true)
  })
})

void beforeEach
