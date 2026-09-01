import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { OpenCodeProvider, type OpencodeHttpApi } from "../providers/opencode"
import * as instances from "../providers/opencode-instances"

const makeSession = (overrides: Record<string, unknown> = {}) => ({
  id: "abc",
  title: "demo",
  time: { updated: Date.now(), created: Date.now() },
  ...overrides,
})

type ApiOverrides = Partial<
  Pick<
    OpencodeHttpApi,
    "listSessions" | "sessionStatus" | "eventStream" | "sessionMessages"
  >
>

const makeApi = (overrides: ApiOverrides = {}): OpencodeHttpApi => ({
  listSessions: async () => [makeSession()],
  sessionStatus: async () => ({ abc: { type: "busy", attention: false } }),
  sessionMessages: async () => [],
  eventStream: async () =>
    (async function* () {
      // empty stream
    })(),
  ...overrides,
})

const mockActiveInstance = (
  status: "idle" | "running" | "waiting" | "waiting_for_human",
) =>
  vi.spyOn(instances, "readOpenCodeInstances").mockResolvedValue([
    {
      instanceId: "opencode:123",
      pid: 123,
      cwd: "/tmp/project",
      sessionId: "abc",
      status,
      updatedAt: Date.now(),
    },
  ])

describe("OpenCodeProvider", () => {
  beforeEach(() => {
    mockActiveInstance("running")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fetchSnapshot combines list + status", async () => {
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      apiFactory: () => makeApi(),
    })
    const ac = new AbortController()
    const agents = await p.fetchSnapshot(ac.signal)
    expect(agents).toHaveLength(1)
    expect(agents[0]?.status).toBe("running")
    expect(agents[0]?.sessionId).toBe("abc")
    expect(agents[0]?.providerId).toBe("opencode")
  })

  it("fetchSnapshot marks idle when no status entry", async () => {
    mockActiveInstance("idle")
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({}),
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      apiFactory: () => api,
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("idle")
  })

  it("fetchSnapshot maps retry status to waiting", async () => {
    mockActiveInstance("waiting")
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({
        abc: { type: "retry", attempt: 1, message: "x", next: 100 },
      }),
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      apiFactory: () => api,
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("waiting")
  })

  it("attention:true in status map overrides to waiting_for_human", async () => {
    mockActiveInstance("waiting_for_human")
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({
        abc: { type: "busy", attention: true },
      }),
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      apiFactory: () => api,
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("waiting_for_human")
  })

  it("filters out sessions updated outside the recency window", async () => {
    vi.spyOn(instances, "readOpenCodeInstances").mockResolvedValue([])
    const old = makeSession({
      id: "old",
      time: { updated: Date.now() - 48 * 60 * 60 * 1000, created: 1 },
    })
    const api = makeApi({ listSessions: async () => [old] })
    const p = new OpenCodeProvider({
      apiFactory: () => api,
      baseUrl: "http://x",
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents).toHaveLength(0)
  })

  it("returns only plugin-reported active instances", async () => {
    vi.spyOn(instances, "readOpenCodeInstances").mockResolvedValue([
      {
        instanceId: "opencode:123",
        pid: 123,
        cwd: "/tmp/project",
        sessionId: "abc",
        status: "waiting_for_human",
        updatedAt: Date.now(),
      },
    ])
    const api = makeApi({
      listSessions: async () => [
        makeSession({ id: "abc" }),
        makeSession({ id: "unrelated" }),
      ],
    })
    const provider = new OpenCodeProvider({
      baseUrl: "http://x",
      apiFactory: () => api,
    })

    const agents = await provider.fetchSnapshot(new AbortController().signal)

    expect(agents).toHaveLength(1)
    expect(agents[0]?.sessionId).toBe("abc")
    expect(agents[0]?.status).toBe("waiting_for_human")
  })

  it("derives running from a message tool part state running", async () => {
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({}),
      sessionMessages: async () => [
        {
          info: { role: "assistant" },
          parts: [{ type: "tool", tool: "bash", state: { status: "running" } }],
        },
      ],
    })
    const p = new OpenCodeProvider({
      apiFactory: () => api,
      baseUrl: "http://x",
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("running")
  })

  it("derives waiting_for_human from a pending tool part", async () => {
    mockActiveInstance("waiting_for_human")
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({}),
      sessionMessages: async () => [
        {
          info: { role: "assistant" },
          parts: [{ type: "tool", tool: "ask", state: { status: "pending" } }],
        },
      ],
    })
    const p = new OpenCodeProvider({
      apiFactory: () => api,
      baseUrl: "http://x",
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("waiting_for_human")
  })

  it("does not report a completed tool from recent history as running", async () => {
    mockActiveInstance("idle")
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({}),
      sessionMessages: async () => [
        {
          info: { role: "assistant" },
          parts: [
            {
              type: "tool",
              callID: "call-1",
              tool: "bash",
              state: { status: "running" },
            },
          ],
        },
        {
          info: { role: "user" },
          parts: [{ type: "tool_result", callID: "call-1" }],
        },
        { info: { role: "assistant" }, finish: "stop", parts: [] },
      ],
    })
    const p = new OpenCodeProvider({
      apiFactory: () => api,
      baseUrl: "http://x",
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("idle")
  })

  it("treats a mid-stream turn (finish null, no parts) as running", async () => {
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({}),
      sessionMessages: async () => [
        // the in-flight message: finish null, empty parts (streaming)
        { info: { role: "assistant" }, finish: null, parts: [] },
      ],
    })
    const p = new OpenCodeProvider({
      apiFactory: () => api,
      baseUrl: "http://x",
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("running")
  })

  it("treats an empty message list as idle", async () => {
    mockActiveInstance("idle")
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({}),
      sessionMessages: async () => [],
    })
    const p = new OpenCodeProvider({
      apiFactory: () => api,
      baseUrl: "http://x",
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(agents[0]?.status).toBe("idle")
  })

  it("passes the message limit when fetching session messages", async () => {
    const sessionMessages = vi.fn(async () => [])
    const api = makeApi({ sessionMessages })
    const p = new OpenCodeProvider({
      apiFactory: () => api,
      baseUrl: "http://x",
    })
    await p.fetchSnapshot(new AbortController().signal)
    expect(sessionMessages).toHaveBeenCalledWith(
      expect.any(AbortSignal),
      "abc",
      6,
    )
  })

  it("exposes createdAt from the session time", async () => {
    const api = makeApi({
      listSessions: async () => [makeSession()],
      sessionStatus: async () => ({}),
    })
    const p = new OpenCodeProvider({
      apiFactory: () => api,
      baseUrl: "http://x",
    })
    const agents = await p.fetchSnapshot(new AbortController().signal)
    expect(typeof agents[0]?.createdAt).toBe("number")
  })

  it("subscribe calls onChange when SSE event maps to a status", async () => {
    const onChange = vi.fn()
    const api = makeApi({
      eventStream: async () =>
        (async function* () {
          yield {
            type: "session.status",
            properties: { sessionID: "abc", status: { type: "busy" } },
          }
        })(),
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      apiFactory: () => api,
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
    const api = makeApi({
      eventStream: async () =>
        (async function* () {
          yield { type: "session.created", properties: { sessionID: "x" } }
        })(),
    })
    const p = new OpenCodeProvider({
      baseUrl: "http://x",
      apiFactory: () => api,
    })
    const ac = new AbortController()
    const unsub = p.subscribe(ac.signal, onChange)
    await new Promise((r) => setTimeout(r, 20))
    unsub()
    expect(onChange).not.toHaveBeenCalled()
  })
})
