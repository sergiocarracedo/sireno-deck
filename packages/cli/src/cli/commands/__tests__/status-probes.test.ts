import { createServer } from "node:http"
import { describe, expect, it } from "vitest"
import { startWsBridge } from "@/render/ws-bridge"
import { probeBridge, probeHttp } from "../status-probes"

describe("status probes", () => {
  it("checks HTTP responses and refuses remote addresses", async () => {
    const server = createServer((_request, response) => response.end("ok"))
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string")
      throw new Error("missing address")
    const url = `http://127.0.0.1:${address.port}`
    try {
      expect(await probeHttp(url)).toBe("responding")
      expect(await probeHttp("http://example.com")).toBe("unknown")
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      )
    }
    expect(await probeHttp(url)).toBe("unreachable")
  })

  it("checks the authenticated bridge handshake", async () => {
    const bridge = await startWsBridge({ expectedToken: "secret" })
    try {
      expect(await probeBridge(bridge.url, "secret")).toBe("responding")
      expect(await probeBridge(bridge.url, "wrong")).toBe("unreachable")
      expect(await probeBridge(bridge.url, null)).toBe("unknown")
    } finally {
      await bridge.close()
    }
  })
})
