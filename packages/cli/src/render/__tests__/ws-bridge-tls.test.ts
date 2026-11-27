import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import WebSocket from "ws"
import { ensureRemoteCertificates } from "@/system/remote-certificates"
import { startWsBridge } from "../ws-bridge"

describe("TLS WebSocket bridge", () => {
  it("accepts a verified TLS connection and authenticates the client", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-wss-"))
    try {
      const certificates = await ensureRemoteCertificates(root, ["127.0.0.1"])
      const bridge = await startWsBridge({
        expectedToken: "synthetic-token",
        tls: {
          key: await readFile(certificates.keyPath),
          cert: await readFile(certificates.certPath),
        },
      })
      try {
        expect(bridge.url).toMatch(/^wss:/)
        const socket = new WebSocket(bridge.url, {
          ca: await readFile(certificates.caPath),
        })
        const result = await new Promise<string>((resolve, reject) => {
          socket.once("error", reject)
          socket.once("open", () =>
            socket.send(
              JSON.stringify({
                type: "hello",
                version: 1,
                token: "synthetic-token",
              }),
            ),
          )
          socket.once("message", (message) =>
            resolve(JSON.parse(message.toString()).type),
          )
        })
        expect(result).toBe("hello-ack")
        socket.close()
        const untrusted = new WebSocket(bridge.url)
        await expect(
          new Promise<void>((resolve, reject) => {
            untrusted.once("open", resolve)
            untrusted.once("error", reject)
          }),
        ).rejects.toThrow()
      } finally {
        await bridge.close()
      }
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
