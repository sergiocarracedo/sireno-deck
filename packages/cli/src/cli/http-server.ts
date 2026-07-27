import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, sep } from "node:path"

import type pino from "pino"

export interface StartHttpServerOptions {
  readonly port: number
  readonly host?: string
  readonly distDir: string
  readonly getToken: () => string | null
  readonly logger: pino.Logger
  readonly getConfigContent?: () => string | null
  readonly getConfigPath?: () => string | null
  readonly getAddons?: () => Array<{
    name: string
    path: string
    internal: boolean
    source: string
    buttonTypes: string[]
    defaultButton: string | null
    decks: Array<{
      id: string
      isOverlay: boolean
      paginated: boolean
      buttons: number
    }>
  }>
}

export interface RunningHttpServer {
  readonly port: number
  stop(): Promise<void>
}

const CONTENT_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
}

const TOKEN_SENTINEL = '<script type="module"'

const injectToken = (html: string, token: string | null): string => {
  if (token === null) return html
  const script = `<script>window.__SIRENO_TOKEN__ = ${JSON.stringify(token)};</script>`
  const idx = html.indexOf(TOKEN_SENTINEL)
  if (idx === -1) return `${script}${html}`
  return `${html.slice(0, idx)}${script}${html.slice(idx)}`
}

const resolveSafePath = (rootDir: string, requested: string): string | null => {
  const cleaned = requested.replace(/\?.*$/, "")
  const decoded = decodeURIComponent(cleaned)
  const joined = normalize(join(rootDir, decoded))
  const rootWithSep = rootDir.endsWith(sep) ? rootDir : `${rootDir}${sep}`
  if (joined !== rootDir && !joined.startsWith(rootWithSep)) return null
  return joined
}

const serveFile = async (
  res: ServerResponse,
  filePath: string,
): Promise<void> => {
  try {
    const data = await readFile(filePath)
    const type =
      CONTENT_TYPES[extname(filePath).toLowerCase()] ??
      "application/octet-stream"
    res.writeHead(200, { "content-type": type, "content-length": data.length })
    res.end(data)
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
    res.end("Not Found")
  }
}

export const startHttpServer = async (
  options: StartHttpServerOptions,
): Promise<RunningHttpServer> => {
  const host = options.host ?? "127.0.0.1"
  const indexPath = join(options.distDir, "index.html")

  let html: string
  try {
    html = await readFile(indexPath, "utf8")
  } catch (err) {
    throw new Error(
      `http-server: cannot read ${indexPath}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      void (async () => {
        const url = req.url ?? "/"
        if (url === "/health") {
          const body = JSON.stringify({ status: "ok" })
          res.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "content-length": body.length,
          })
          res.end(body)
          return
        }
        if (url === "/" || url === "/index.html") {
          const injected = injectToken(html, options.getToken())
          res.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "content-length": Buffer.byteLength(injected),
          })
          res.end(injected)
          return
        }
        if (url === "/api/config" || url === "/api/config/") {
          const text = options.getConfigContent?.() ?? null
          if (text === null) {
            res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
            res.end("Config not available")
            return
          }
          res.writeHead(200, {
            "content-type": "text/plain; charset=utf-8",
            "content-length": Buffer.byteLength(text),
          })
          res.end(text)
          return
        }
        if (url === "/api/config-path") {
          const path = options.getConfigPath?.() ?? null
          const body = JSON.stringify({ path })
          res.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "content-length": Buffer.byteLength(body),
          })
          res.end(body)
          return
        }
        if (url === "/api/addons" || url === "/api/addons/") {
          const addons = options.getAddons?.() ?? []
          const body = JSON.stringify({ addons })
          res.writeHead(200, {
            "content-type": "application/json; charset=utf-8",
            "content-length": Buffer.byteLength(body),
          })
          res.end(body)
          return
        }
        if (url.startsWith("/assets/")) {
          const filePath = resolveSafePath(options.distDir, url)
          if (filePath === null) {
            res.writeHead(403)
            res.end("Forbidden")
            return
          }
          try {
            const st = await stat(filePath)
            if (!st.isFile()) {
              res.writeHead(404)
              res.end("Not Found")
              return
            }
          } catch {
            res.writeHead(404)
            res.end("Not Found")
            return
          }
          await serveFile(res, filePath)
          return
        }
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
        res.end("Not Found")
      })().catch((err: unknown) => {
        options.logger.error({ err }, "http-server: request failed")
        if (!res.headersSent) {
          res.writeHead(500)
          res.end("Internal Server Error")
        }
      })
    },
  )

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(options.port, host, () => {
      server.off("error", reject)
      resolve()
    })
  })

  const addr = server.address()
  if (addr === null || typeof addr === "string") {
    throw new Error("http-server: failed to bind")
  }
  const boundPort = addr.port
  options.logger.info({ port: boundPort, host }, "http-server started")

  return {
    port: boundPort,
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
        server.closeAllConnections?.()
      }),
  }
}
