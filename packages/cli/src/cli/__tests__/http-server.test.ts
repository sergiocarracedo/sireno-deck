import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { createLogger } from "@/util/logger"

import { startHttpServer } from "../http-server"

const silentLogger = () => createLogger({ level: "silent" })

const TEST_DIR = join(tmpdir(), `sireno-deck-http-test-${process.pid}`)

const writeIndexHtml = (content: string): void => {
  writeFileSync(join(TEST_DIR, "index.html"), content, "utf8")
}

const writeAsset = (relPath: string, content: string): void => {
  const full = join(TEST_DIR, relPath)
  const dir = full.substring(0, full.lastIndexOf("/"))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(full, content, "utf8")
}

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
  mkdirSync(TEST_DIR, { recursive: true })
  writeIndexHtml(
    '<!doctype html><html><head><script type="module" src="/assets/main.js"></script></head><body>x</body></html>',
  )
  writeAsset("assets/main.js", "console.log('hi')")
})

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
})

const fetchText = async (
  url: string,
): Promise<{
  status: number
  headers: Record<string, string>
  body: string
}> => {
  const res = await fetch(url)
  const body = await res.text()
  const headers: Record<string, string> = {}
  res.headers.forEach((v, k) => {
    headers[k] = v
  })
  return { status: res.status, headers, body }
}

describe("startHttpServer", () => {
  it("serves the index.html on /", async () => {
    const server = await startHttpServer({
      port: 0,
      distDir: TEST_DIR,
      getToken: () => null,
      logger: silentLogger(),
    })
    try {
      const res = await fetchText(`http://127.0.0.1:${server.port}/`)
      expect(res.status).toBe(200)
      expect(res.body).toContain('<script type="module" src="/assets/main.js">')
      expect(res.body).not.toContain("__SIRENO_TOKEN__")
    } finally {
      await server.stop()
    }
  })

  it("injects the WS token before the module script", async () => {
    const server = await startHttpServer({
      port: 0,
      distDir: TEST_DIR,
      getToken: () => "test-token-12345",
      logger: silentLogger(),
    })
    try {
      const res = await fetchText(`http://127.0.0.1:${server.port}/`)
      expect(res.status).toBe(200)
      const tokenIdx = res.body.indexOf("__SIRENO_TOKEN__")
      const moduleIdx = res.body.indexOf('script type="module"')
      expect(tokenIdx).toBeGreaterThan(-1)
      expect(moduleIdx).toBeGreaterThan(tokenIdx)
      expect(res.body).toContain('"test-token-12345"')
    } finally {
      await server.stop()
    }
  })

  it("serves /assets/* with correct content-type", async () => {
    const server = await startHttpServer({
      port: 0,
      distDir: TEST_DIR,
      getToken: () => null,
      logger: silentLogger(),
    })
    try {
      const res = await fetchText(
        `http://127.0.0.1:${server.port}/assets/main.js`,
      )
      expect(res.status).toBe(200)
      expect(res.headers["content-type"]).toContain("text/javascript")
      expect(res.body).toBe("console.log('hi')")
    } finally {
      await server.stop()
    }
  })

  it("responds with 200 on /health", async () => {
    const server = await startHttpServer({
      port: 0,
      distDir: TEST_DIR,
      getToken: () => null,
      logger: silentLogger(),
    })
    try {
      const res = await fetchText(`http://127.0.0.1:${server.port}/health`)
      expect(res.status).toBe(200)
      expect(res.headers["content-type"]).toContain("application/json")
      expect(JSON.parse(res.body)).toEqual({ status: "ok" })
    } finally {
      await server.stop()
    }
  })

  it("returns 404 for unknown paths", async () => {
    const server = await startHttpServer({
      port: 0,
      distDir: TEST_DIR,
      getToken: () => null,
      logger: silentLogger(),
    })
    try {
      const res = await fetchText(`http://127.0.0.1:${server.port}/nope`)
      expect(res.status).toBe(404)
    } finally {
      await server.stop()
    }
  })

  it("returns 403 for path traversal attempts", async () => {
    const server = await startHttpServer({
      port: 0,
      distDir: TEST_DIR,
      getToken: () => null,
      logger: silentLogger(),
    })
    try {
      const res = await fetchText(
        `http://127.0.0.1:${server.port}/assets/../etc/passwd`,
      )
      expect([403, 404]).toContain(res.status)
    } finally {
      await server.stop()
    }
  })

  it("throws if index.html is missing", async () => {
    rmSync(join(TEST_DIR, "index.html"))
    await expect(
      startHttpServer({
        port: 0,
        distDir: TEST_DIR,
        getToken: () => null,
        logger: silentLogger(),
      }),
    ).rejects.toThrow(/cannot read/)
  })

  it("stop() resolves and frees the port", async () => {
    const server = await startHttpServer({
      port: 0,
      distDir: TEST_DIR,
      getToken: () => null,
      logger: silentLogger(),
    })
    await server.stop()
    await expect(
      fetch(`http://127.0.0.1:${server.port}/health`).then((r) => r.status),
    ).rejects.toThrow()
  })

  it("rotates the token per request when getToken changes", async () => {
    let token = "first"
    const server = await startHttpServer({
      port: 0,
      distDir: TEST_DIR,
      getToken: () => token,
      logger: silentLogger(),
    })
    try {
      const first = await fetchText(`http://127.0.0.1:${server.port}/`)
      expect(first.body).toContain('"first"')
      token = "second"
      const second = await fetchText(`http://127.0.0.1:${server.port}/`)
      expect(second.body).toContain('"second"')
    } finally {
      await server.stop()
    }
  })
})
