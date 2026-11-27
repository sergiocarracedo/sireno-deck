import { randomBytes, timingSafeEqual } from "node:crypto"
import { request as httpRequest } from "node:http"
import { createServer } from "node:https"

export async function startRemoteGateway(options: {
  host: string
  port: number
  targetPort: number
  bridgePort?: number
  token: string
  key: Buffer | string
  cert: Buffer | string
  allowedOrigins?: readonly string[]
  sessions?: Set<string>
}) {
  if (!options.token) throw new Error("Remote authentication is unavailable")
  if (
    (options.host === "0.0.0.0" || options.host === "::") &&
    !options.allowedOrigins?.length
  )
    throw new Error("Remote gateway requires allowed origins")
  const sessions = options.sessions ?? new Set<string>()
  const allowedOrigins = new Set(options.allowedOrigins ?? [])
  const authorized = (cookie: string | undefined) => {
    const session = cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("__Host-sireno-session="))
      ?.slice("__Host-sireno-session=".length)
    return session !== undefined && sessions.has(session)
  }
  const server = createServer(
    { key: options.key, cert: options.cert },
    (req, res) => {
      res.setHeader("Cache-Control", "no-store")
      res.setHeader("X-Content-Type-Options", "nosniff")
      const origin = req.headers.origin
      if (origin && !allowedOrigins.has(origin)) {
        res.writeHead(403).end("Invalid origin")
        return
      }
      const path = req.url ?? "/"
      if (path === "/login" && req.method === "POST") {
        if (!origin || !allowedOrigins.has(origin)) {
          res.writeHead(403).end("Invalid origin")
          return
        }
        let body = ""
        req.setEncoding("utf8")
        req.on("data", (chunk: string) => {
          body += chunk
          if (body.length > 4096) req.destroy()
        })
        req.on("end", () => {
          const supplied = Buffer.from(
            new URLSearchParams(body).get("token") ?? "",
          )
          const expected = Buffer.from(options.token)
          if (
            supplied.length !== expected.length ||
            !timingSafeEqual(supplied, expected)
          ) {
            res.writeHead(403).end("Invalid token")
            return
          }
          const session = randomBytes(32).toString("base64url")
          sessions.add(session)
          res
            .writeHead(303, {
              Location: "/",
              "Set-Cookie": `__Host-sireno-session=${session}; Path=/; Secure; HttpOnly; SameSite=Strict`,
            })
            .end()
        })
        return
      }
      if (!authorized(req.headers.cookie)) {
        res
          .writeHead(401, { "Content-Type": "text/html; charset=utf-8" })
          .end(
            '<!doctype html><html lang="en"><title>Sireno Deck</title><form method="post" action="/login"><label for="token">Access token</label><input id="token" name="token" type="password" autocomplete="current-password" required><button type="submit">Connect</button></form></html>',
          )
        return
      }
      const proxy = httpRequest(
        {
          hostname: "127.0.0.1",
          port: options.targetPort,
          method: req.method,
          path,
          headers: {
            ...req.headers,
            host: `127.0.0.1:${options.targetPort}`,
            cookie: `sireno-token=${options.token}`,
          },
        },
        (upstream) => {
          res.writeHead(upstream.statusCode ?? 502, upstream.headers)
          upstream.pipe(res)
        },
      )
      proxy.on("error", () => {
        if (!res.headersSent) res.writeHead(502)
        res.end("Remote interface unavailable")
      })
      req.pipe(proxy)
    },
  )
  server.on("upgrade", (req, socket, head) => {
    socket.on("error", () => socket.destroy())
    const origin = req.headers.origin
    if (
      !authorized(req.headers.cookie) ||
      !origin ||
      !allowedOrigins.has(origin)
    ) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n")
      return
    }
    const upstream = httpRequest({
      hostname: "127.0.0.1",
      port:
        req.url === "/bridge" && options.bridgePort
          ? options.bridgePort
          : options.targetPort,
      method: req.method,
      path: req.url === "/bridge" && options.bridgePort ? "/" : req.url,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${req.url === "/bridge" && options.bridgePort ? options.bridgePort : options.targetPort}`,
        cookie: `sireno-token=${options.token}`,
      },
    })
    upstream.on("upgrade", (response, remote, remoteHead) => {
      socket.write(
        `HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`,
      )
      for (let index = 0; index < response.rawHeaders.length; index += 2)
        socket.write(
          `${response.rawHeaders[index]}: ${response.rawHeaders[index + 1]}\r\n`,
        )
      socket.write("\r\n")
      if (head.length) remote.write(head)
      if (remoteHead.length) socket.write(remoteHead)
      socket.pipe(remote).pipe(socket)
      remote.on("error", () => socket.destroy())
      socket.on("error", () => remote.destroy())
    })
    upstream.on("response", () => socket.destroy())
    upstream.on("error", () => socket.destroy())
    upstream.end()
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(options.port, options.host, resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("Remote gateway has no address")
  if (options.host !== "0.0.0.0" && options.host !== "::")
    allowedOrigins.add(
      `https://${options.host.includes(":") ? `[${options.host}]` : options.host}:${address.port}`,
    )
  return {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  }
}
