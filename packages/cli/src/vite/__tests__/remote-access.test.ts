import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createServer, type ViteDevServer } from "vite"

import { sirenoDeck2 } from "../virtual-modules"

describe("remote Vite access", () => {
  let server: ViteDevServer | undefined
  let root: string | undefined

  afterEach(async () => {
    await server?.close()
    if (root) await rm(root, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  it("gates application routes but exempts Vite client assets", async () => {
    vi.stubEnv("SIRENO_REQUIRE_TOKEN", "synthetic-token")
    root = await mkdtemp(join(tmpdir(), "sireno-remote-access-"))
    await writeFile(
      join(root, "index.html"),
      "<html><head></head><body>test</body></html>",
    )
    server = await createServer({
      configFile: false,
      root,
      plugins: [sirenoDeck2({ token: "synthetic-token" })],
      server: { host: "127.0.0.1", port: 0, hmr: false },
      logLevel: "silent",
    })
    await server.listen()
    const address = server.httpServer?.address()
    if (!address || typeof address === "string") throw new Error("No test port")
    const base = `http://127.0.0.1:${address.port}`

    expect((await fetch(`${base}/`)).status).toBe(403)
    expect((await fetch(`${base}/api/config`)).status).toBe(403)
    expect(
      (await fetch(`${base}/@id/__x00__virtual:sireno/token`)).status,
    ).toBe(403)
    expect((await fetch(`${base}/?token=synthetic-token`)).status).toBe(200)
    expect(
      (
        await fetch(`${base}/`, {
          headers: { cookie: "sireno-token=synthetic-token" },
        })
      ).status,
    ).toBe(200)
    expect((await fetch(`${base}/@vite/client`)).status).toBe(200)
  })
})
