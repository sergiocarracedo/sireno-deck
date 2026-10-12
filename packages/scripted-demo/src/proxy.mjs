import { WebSocket, WebSocketServer } from "ws"

const OPEN = 1
const send = (socket, message) => {
  if (socket.readyState === OPEN) socket.send(JSON.stringify(message))
}

const filteredServerMessage = (message, replacements) => {
  if (message?.type !== "state" || replacements.length === 0) return message
  const channels = Object.fromEntries(
    Object.entries(message.channels ?? {}).filter(
      ([channel]) => !replacements.includes(channel),
    ),
  )
  return Object.keys(channels).length === 0 ? null : { ...message, channels }
}

export const startProxy = async ({
  mode,
  upstreamUrl,
  replaceChannels = [],
  initialMessages = [],
}) => {
  const clients = new Set()
  const upstreams = new Set()
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 })
  await new Promise((resolve, reject) => {
    server.once("listening", resolve)
    server.once("error", reject)
  })
  const address = server.address()
  if (address === null || typeof address === "string")
    throw new Error("Could not start scripted-demo proxy")

  const broadcast = (message) => {
    for (const client of clients) send(client, message)
  }

  server.on("connection", (client) => {
    clients.add(client)
    let upstream = null
    if (mode === "passthrough") {
      upstream = new WebSocket(upstreamUrl)
      upstreams.add(upstream)
      upstream.on("message", (raw) => {
        const message = filteredServerMessage(
          JSON.parse(String(raw)),
          replaceChannels,
        )
        if (message !== null) send(client, message)
      })
      upstream.on("close", () => client.close())
    }

    client.on("message", (raw) => {
      const message = JSON.parse(String(raw))
      if (mode === "standalone" && message.type === "hello") {
        for (const initial of initialMessages) send(client, initial)
      }
      if (upstream?.readyState === OPEN) upstream.send(JSON.stringify(message))
    })
    client.on("close", () => {
      clients.delete(client)
      upstream?.close()
      if (upstream) upstreams.delete(upstream)
    })
  })

  return {
    url: `ws://127.0.0.1:${address.port}`,
    broadcast,
    dispatchToService(message) {
      for (const upstream of upstreams) send(upstream, message)
    },
    async close() {
      for (const client of clients) client.close()
      for (const upstream of upstreams) upstream.close()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}
