import { describe, expect, it, vi } from "vitest"

import { ensureOpencodeServer } from "../providers/spawn"

const baseUrl = "http://127.0.0.1:4096"

describe("ensureOpencodeServer", () => {
  it("returns null when server is already reachable", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ healthy: true }), { status: 200 }),
    )
    const r = await ensureOpencodeServer(
      baseUrl,
      new AbortController().signal,
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    )
    expect(r).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("spawns opencode serve when not reachable", async () => {
    let calls = 0
    const fetchImpl = vi.fn(async () => {
      calls += 1
      if (calls < 2) {
        return new Response("not ok", { status: 503 })
      }
      return new Response(JSON.stringify({ healthy: true }), { status: 200 })
    })
    const execaImpl = vi.fn(() => {
      return {
        kill: vi.fn(async () => undefined),
      }
    })
    const r = await ensureOpencodeServer(
      baseUrl,
      new AbortController().signal,
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        execaImpl: execaImpl as unknown as (
          cmd: string,
          args: ReadonlyArray<string>,
        ) => { kill: () => Promise<unknown> },
        sleep: async () => undefined,
      },
    )
    expect(r).not.toBeNull()
    expect(execaImpl).toHaveBeenCalledWith("opencode", [
      "serve",
      "--port",
      "4096",
    ])
    expect(r?.baseUrl).toBe(baseUrl)
  })

  it("throws AbortError when signal is aborted during probe", async () => {
    const ac = new AbortController()
    ac.abort()
    await expect(
      ensureOpencodeServer(baseUrl, ac.signal, {
        fetchImpl: vi.fn() as unknown as typeof fetch,
        sleep: async () => undefined,
      }),
    ).rejects.toThrow()
  })
})
