import { describe, expect, it, vi } from "vitest"

import {
  OpenCodeProvider,
  type OpencodeClientLike,
} from "../providers/opencode"

const makeSession = (overrides: Record<string, unknown> = {}) => ({
  id: "abc",
  title: "demo",
  time: { updated: 1 },
  ...overrides,
})

const makeClient = (
  overrides: Partial<OpencodeClientLike> = {},
): OpencodeClientLike => ({
  session: {
    list: async () => [makeSession()],
    status: async () => ({ abc: { type: "busy" } }),
    ...overrides.session,
  },
  event: {
    subscribe: async () => ({
      stream: (async function* () {
        // empty stream
      })(),
    }),
    ...overrides.event,
  },
})

describe("OpenCodeProvider", () => {
  it("fetchSnapshot combines list + status", async () => {
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      clientFactory: () => makeClient(),
    })
    const ac = new AbortController()
    const agents = await p.fetchSnapshot(ac.signal)
    expect(agents).toHaveLength(1)
    expect(agents[0]?.status).toBe("running")
    expect(agents[0]?.sessionId).toBe("abc")
    expect(agents[0]?.providerId).toBe("opencode")
  })

  it("fetchSnapshot marks idle when no status entry", async () => {
    const client = makeClient({
      session: {
        list: async () => [makeSession()],
        status: async () => ({}),
      },
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      clientFactory: () => client,
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("idle")
  })

  it("fetchSnapshot maps retry status to waiting", async () => {
    const client = makeClient({
      session: {
        list: async () => [makeSession()],
        status: async () => ({
          abc: { type: "retry", attempt: 1, message: "x", next: 100 },
        }),
      },
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      clientFactory: () => client,
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("waiting")
  })

  it("subscribe calls onChange when SSE event maps to a status", async () => {
    const onChange = vi.fn()
    const client = makeClient({
      event: {
        subscribe: async () => ({
          stream: (async function* () {
            yield {
              type: "session.status",
              properties: { sessionID: "abc", status: { type: "busy" } },
            }
          })(),
        }),
      },
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      clientFactory: () => client,
    })
    const ac = new AbortController()
    const unsub = p.subscribe(ac.signal, onChange)
    await new Promise((r) => setTimeout(r, 20))
    ac.abort()
    unsub()
    expect(onChange).toHaveBeenCalled()
  })

  it("subscribe ignores unknown event types", async () => {
    const onChange = vi.fn()
    const client = makeClient({
      event: {
        subscribe: async () => ({
          stream: (async function* () {
            yield { type: "session.created", properties: { sessionID: "x" } }
          })(),
        }),
      },
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      clientFactory: () => client,
    })
    const ac = new AbortController()
    const unsub = p.subscribe(ac.signal, onChange)
    await new Promise((r) => setTimeout(r, 20))
    unsub()
    expect(onChange).not.toHaveBeenCalled()
  })
})
