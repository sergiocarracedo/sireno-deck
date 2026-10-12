import assert from "node:assert/strict"
import test from "node:test"

import { WebSocket, WebSocketServer } from "ws"
import { startProxy } from "../src/proxy.mjs"

const once = (target, event) =>
  new Promise((resolve, reject) => {
    target.once(event, resolve)
    target.once("error", reject)
  })

test("passthrough removes channels owned by a scene", async () => {
  const upstream = new WebSocketServer({ host: "127.0.0.1", port: 0 })
  await once(upstream, "listening")
  const address = upstream.address()
  assert.notEqual(typeof address, "string")
  const proxy = await startProxy({
    mode: "passthrough",
    upstreamUrl: `ws://127.0.0.1:${address.port}`,
    replaceChannels: ["coding-agents:agents"],
  })
  const client = new WebSocket(proxy.url)

  try {
    await once(client, "open")
    const upstreamClient = await once(upstream, "connection")
    const received = once(client, "message")
    upstreamClient.send(
      JSON.stringify({
        type: "state",
        channels: {
          "coding-agents:agents": { hidden: true },
          "weather:state": { visible: true },
        },
      }),
    )
    const raw = await received
    assert.deepEqual(JSON.parse(String(raw)), {
      type: "state",
      channels: { "weather:state": { visible: true } },
    })
  } finally {
    client.close()
    await proxy.close()
    await new Promise((resolve) => upstream.close(resolve))
  }
})
