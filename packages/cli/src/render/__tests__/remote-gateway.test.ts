import { createServer } from "node:http"
import { request } from "node:https"
import type { IncomingMessage } from "node:http"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import WebSocket, { WebSocketServer } from "ws"
import { ensureRemoteCertificates } from "@/system/remote-certificates"
import { startRemoteGateway } from "../remote-gateway"
import { startWsBridge } from "../ws-bridge"

describe("remote HTTPS gateway", () => {
  it("closes active websocket clients during shutdown", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-gateway-close-"))
    const backend = createServer()
    const wsServer = new WebSocketServer({ server: backend })
    await new Promise<void>((resolve) =>
      backend.listen(0, "127.0.0.1", resolve),
    )
    const address = backend.address()
    if (!address || typeof address === "string")
      throw new Error("No backend port")
    try {
      const certs = await ensureRemoteCertificates(root, ["127.0.0.1"])
      const sessions = new Set(["synthetic-session"])
      const gateway = await startRemoteGateway({
        host: "127.0.0.1",
        port: 0,
        targetPort: address.port,
        token: "synthetic-token",
        sessions,
        key: await readFile(certs.keyPath),
        cert: await readFile(certs.certPath),
      })
      const socket = new WebSocket(`wss://127.0.0.1:${gateway.port}/socket`, {
        ca: await readFile(certs.caPath),
        headers: {
          cookie: "__Host-sireno-session=synthetic-session",
          origin: `https://127.0.0.1:${gateway.port}`,
        },
      })
      await new Promise<void>((resolve, reject) => {
        socket.once("open", resolve)
        socket.once("error", reject)
      })
      const closed = new Promise<void>((resolve) =>
        socket.once("close", () => resolve()),
      )
      await gateway.close()
      await closed
    } finally {
      for (const client of wsServer.clients) client.terminate()
      await new Promise<void>((resolve) => backend.close(() => resolve()))
      await rm(root, { recursive: true, force: true })
    }
  }, 3000)

  it("requires login before proxying the protected interface", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-gateway-"))
    const backend = createServer((_req, res) =>
      res.end("synthetic protected content"),
    )
    const wsServer = new WebSocketServer({ server: backend })
    wsServer.on("connection", (socket) =>
      socket.on("message", (message) => socket.send(message)),
    )
    await new Promise<void>((resolve) =>
      backend.listen(0, "127.0.0.1", resolve),
    )
    const address = backend.address()
    if (!address || typeof address === "string")
      throw new Error("No backend port")
    try {
      const certs = await ensureRemoteCertificates(root, ["127.0.0.1"])
      const sessions = new Set<string>()
      const bridge = await startWsBridge({ expectedToken: "synthetic-token" })
      const gateway = await startRemoteGateway({
        host: "127.0.0.1",
        port: 0,
        targetPort: address.port,
        token: "synthetic-token",
        key: await readFile(certs.keyPath),
        cert: await readFile(certs.certPath),
        sessions,
        bridgePort: bridge.port,
      })
      const frontend = await startRemoteGateway({
        host: "127.0.0.1",
        port: 0,
        targetPort: address.port,
        token: "synthetic-token",
        key: await readFile(certs.keyPath),
        cert: await readFile(certs.certPath),
        sessions,
        allowedOrigins: [`https://127.0.0.1:${gateway.port}`],
      })
      const ca = await readFile(certs.caPath)
      const send = (
        path: string,
        options: {
          method?: string
          cookie?: string
          body?: string
          port?: number
        } = {},
      ) =>
        new Promise<{
          status: number
          body: string
          cookie: string | undefined
          location: string | undefined
        }>((resolve, reject) => {
          const req = request(
            {
              hostname: "127.0.0.1",
              port: options.port ?? gateway.port,
              path,
              method: options.method,
              ca,
              headers: {
                origin: `https://127.0.0.1:${gateway.port}`,
                ...(options.cookie ? { cookie: options.cookie } : {}),
              },
            },
            (res) => {
              let body = ""
              res.setEncoding("utf8")
              res.on("data", (chunk: string) => {
                body += chunk
              })
              res.on("end", () =>
                resolve({
                  status: res.statusCode ?? 0,
                  body,
                  cookie: res.headers["set-cookie"]?.[0],
                  location: res.headers.location,
                }),
              )
            },
          )
          req.on("error", reject)
          req.end(options.body)
        })
      try {
        await expect(
          fetch(`http://127.0.0.1:${gateway.port}/`),
        ).rejects.toThrow()
        expect((await send("/")).status).toBe(401)
        expect((await send("http://[")).status).toBe(400)
        expect((await send("/")).status).toBe(401)
        const page = await send("/")
        expect(page.body).toContain("<title>Sireno Deck</title>")
        expect(page.body).toContain('class="brand"')
        expect(page.body).toContain("/logo.png")
        expect(page.body).toContain("Sireno Deck")
        expect(page.body).toMatch(/class="version">v[\w.-]+</)
        expect(page.body).toContain("Access token")
        expect(page.body).toContain('action="/login"')
        const deckPage = await send("/?deckOnly=1")
        expect(deckPage.body).toContain('action="/login?deckOnly=1"')
        expect(
          (await send("/login", { method: "POST", body: "token=wrong" }))
            .status,
        ).toBe(403)
        expect(
          (await send("/login", { method: "POST", body: "token=wrong" })).body,
        ).toContain("was not accepted")
        const login = await send("/login", {
          method: "POST",
          body: "token=synthetic-token",
        })
        expect(login.status).toBe(303)
        const deckLogin = await send("/login?deckOnly=1", {
          method: "POST",
          body: "token=synthetic-token",
        })
        expect(deckLogin.location).toBe("/?deckOnly=1")
        expect(login.cookie).toContain("HttpOnly")
        expect(login.cookie).toContain("Secure")
        expect((await send("/", { cookie: login.cookie })).body).toBe(
          "synthetic protected content",
        )
        expect(
          (await send("/", { cookie: login.cookie, port: frontend.port })).body,
        ).toBe("synthetic protected content")
        const wrongOrigin = new WebSocket(
          `wss://127.0.0.1:${gateway.port}/socket`,
          {
            ca,
            headers: {
              cookie: login.cookie,
              origin: "https://attacker.invalid",
            },
          },
        )
        await expect(
          new Promise<void>((resolve, reject) => {
            wrongOrigin.once("open", resolve)
            wrongOrigin.once("error", reject)
          }),
        ).rejects.toThrow("403")
        const anonymous = new WebSocket(
          `wss://127.0.0.1:${gateway.port}/socket`,
          {
            ca,
            headers: { origin: `https://127.0.0.1:${gateway.port}` },
          },
        )
        await expect(
          new Promise<void>((resolve, reject) => {
            anonymous.once("open", resolve)
            anonymous.once("error", reject)
          }),
        ).rejects.toThrow("403")
        const socket = new WebSocket(`wss://127.0.0.1:${gateway.port}/socket`, {
          ca,
          headers: {
            cookie: login.cookie,
            origin: `https://127.0.0.1:${gateway.port}`,
          },
        })
        const echoed = await new Promise<string>((resolve, reject) => {
          socket.once("error", reject)
          socket.once("open", () => socket.send("synthetic"))
          socket.once("message", (value) => resolve(value.toString()))
        })
        expect(echoed).toBe("synthetic")
        socket.close()
        const bridgeClient = new WebSocket(
          `wss://127.0.0.1:${gateway.port}/bridge`,
          {
            ca,
            headers: {
              cookie: login.cookie,
              origin: `https://127.0.0.1:${gateway.port}`,
            },
          },
        )
        const ack = await new Promise<string>((resolve, reject) => {
          bridgeClient.once("error", reject)
          bridgeClient.once("open", () =>
            bridgeClient.send(
              JSON.stringify({
                type: "hello",
                version: 1,
                token: "synthetic-token",
              }),
            ),
          )
          bridgeClient.once("message", (value) =>
            resolve(JSON.parse(value.toString()).type),
          )
        })
        expect(ack).toBe("hello-ack")
        bridgeClient.close()
      } finally {
        await frontend.close()
        await gateway.close()
        await bridge.close()
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        backend.close((error) => (error ? reject(error) : resolve())),
      )
      await rm(root, { recursive: true, force: true })
    }
  })

  it("exchanges a token in the URL for a session and redirects to a clean URL", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-gateway-exchange-"))
    const backend = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("protected")
    })
    await new Promise<void>((resolve) =>
      backend.listen(0, "127.0.0.1", resolve),
    )
    const address = backend.address()
    if (!address || typeof address === "string") throw new Error("No port")
    const certs = await ensureRemoteCertificates(root, ["127.0.0.1"])
    const sessions = new Set<string>()
    const gateway = await startRemoteGateway({
      host: "127.0.0.1",
      port: 0,
      targetPort: address.port,
      token: "synthetic-token",
      key: await readFile(certs.keyPath),
      cert: await readFile(certs.certPath),
      sessions,
      allowedOrigins: ["https://127.0.0.1:8443"],
    })
    const ca = await readFile(certs.caPath)
    const get = (path: string) =>
      new Promise<{
        status: number
        location: string | undefined
        cookie: string | undefined
      }>((resolve, reject) => {
        const req = request(
          {
            hostname: "127.0.0.1",
            port: gateway.port,
            path,
            ca,
          },
          (res) => {
            res.resume()
            res.on("end", () =>
              resolve({
                status: res.statusCode ?? 0,
                location: res.headers.location,
                cookie: res.headers["set-cookie"]?.[0],
              }),
            )
          },
        )
        req.on("error", reject)
        req.end()
      })
    try {
      const exchange = await get("/?token=synthetic-token&deckOnly=1")
      expect(exchange.status).toBe(303)
      // The token is dropped from the URL the browser ends up on.
      expect(exchange.location).toBe("/?deckOnly=1")
      expect(exchange.cookie).toContain("__Host-sireno-session=")
      expect(exchange.cookie).toContain("HttpOnly")
      expect(exchange.cookie).toContain("Secure")
      expect(sessions.size).toBe(1)
      const wrong = await get("/?token=not-the-token")
      expect(wrong.status).toBe(401)
      expect(sessions.size).toBe(1)
      const logo = await get("/logo.png")
      expect(logo.status).toBe(200)
    } finally {
      await gateway.close()
      await new Promise<void>((resolve, reject) =>
        backend.close((error) => (error ? reject(error) : resolve())),
      )
      await rm(root, { recursive: true, force: true })
    }
  })

  it("bounds stored sessions and restricts framing to the allowed origins", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-gateway-sessions-"))
    const certs = await ensureRemoteCertificates(root, ["127.0.0.1"])
    const sessions = new Set<string>()
    const gateway = await startRemoteGateway({
      host: "127.0.0.1",
      port: 0,
      targetPort: 9,
      token: "synthetic-token",
      key: await readFile(certs.keyPath),
      cert: await readFile(certs.certPath),
      sessions,
      allowedOrigins: ["https://127.0.0.1:8443"],
    })
    const ca = await readFile(certs.caPath)
    const login = async () => {
      const response = await new Promise<IncomingMessage>((resolve, reject) => {
        const req = request(
          {
            hostname: "127.0.0.1",
            port: gateway.port,
            path: "/login",
            method: "POST",
            ca,
            headers: { origin: "https://127.0.0.1:8443" },
          },
          resolve,
        )
        req.on("error", reject)
        req.end("token=synthetic-token")
      })
      response.resume()
      return response.headers["set-cookie"]?.[0]
    }
    try {
      const first = await login()
      expect(first).toBeDefined()
      for (let index = 0; index < 80; index++) await login()
      expect(sessions.size).toBeLessThanOrEqual(64)
      const response = await new Promise<IncomingMessage>((resolve, reject) => {
        const req = request(
          {
            hostname: "127.0.0.1",
            port: gateway.port,
            path: "/",
            ca,
            headers: { origin: "https://127.0.0.1:8443" },
          },
          resolve,
        )
        req.on("error", reject)
        req.end()
      })
      response.resume()
      expect(response.headers["content-security-policy"]).toContain(
        "frame-ancestors 'self' https://127.0.0.1:8443",
      )
      expect(response.headers["cache-control"]).toBe("no-store")
    } finally {
      await gateway.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
