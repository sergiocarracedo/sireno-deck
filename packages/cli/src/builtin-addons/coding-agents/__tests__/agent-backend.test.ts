import { describe, expect, it, vi } from "vitest"

import agentBackend from "../buttons/agent/backend"
import type { Agent, AgentsSnapshot } from "../shared/state"

type Seed = {
  sessionId: string
  providerId: "opencode" | "claude-code"
  directory?: string
  status: Agent["status"]
}

const snapshot = (seed: Seed[]): AgentsSnapshot => ({
  byProvider: {
    opencode: seed
      .filter((s) => s.providerId === "opencode")
      .map((s) => ({
        sessionId: s.sessionId,
        providerId: "opencode" as const,
        title: s.sessionId,
        status: s.status,
        updatedAt: 100,
        ...(s.directory ? { directory: s.directory } : {}),
      })),
    "claude-code": seed
      .filter((s) => s.providerId === "claude-code")
      .map((s) => ({
        sessionId: s.sessionId,
        providerId: "claude-code" as const,
        title: s.sessionId,
        status: s.status,
        updatedAt: 200,
        ...(s.directory ? { directory: s.directory } : {}),
      })),
  },
  attention: [],
  generatedAt: Date.now(),
})

const makeCtx = (snap: AgentsSnapshot, slot: number) => {
  const run = vi.fn(async (_cmd: string) => ({
    stdout: "",
    stderr: "",
    exitCode: 0,
    durationMs: 1,
  }))
  const ctx = {
    config: { slot },
    buttonId: "x",
    methods: {
      "coding-agents:getSnapshot": () => snap,
      "coding-agents:dismissAttention": vi.fn(),
    },
    executor: { run },
  } as never
  return { ctx: ctx as Parameters<typeof agentBackend.onTap>[0], run }
}

describe("coding-agents agent button backend", () => {
  it("declares tap, hold, and dbl-tap gesture handlers", () => {
    expect(agentBackend.gestureHandlers).toContain("tap")
    expect(agentBackend.gestureHandlers).toContain("hold")
    expect(agentBackend.gestureHandlers).toContain("dbl-tap")
  })

  it("tap is a no-op — the frontend uses tap for page changes", async () => {
    const snap = snapshot([
      {
        sessionId: "abc",
        providerId: "opencode",
        directory: "/tmp/p",
        status: "running",
      },
    ])
    const { ctx, run } = makeCtx(snap, 0)
    await agentBackend.onTap?.(ctx)
    expect(run).not.toHaveBeenCalled()
  })

  it("hold spawns a terminal resuming the opencode session", async () => {
    const snap = snapshot([
      {
        sessionId: "abc",
        providerId: "opencode",
        directory: "/tmp/p",
        status: "running",
      },
    ])
    const { ctx, run } = makeCtx(snap, 0)
    await agentBackend.onHold?.(ctx)
    expect(run).toHaveBeenCalledTimes(1)
    const cmd = run.mock.calls[0]?.[0] as string
    expect(cmd).toContain("opencode --session")
    expect(cmd).toContain("abc")
    expect(cmd).toContain("/tmp/p")
    expect(cmd).toContain("nohup")
  })

  it("hold uses claude --resume for claude-code sessions", async () => {
    const snap = snapshot([
      {
        sessionId: "xyz",
        providerId: "claude-code",
        directory: "/w/d",
        status: "waiting_for_human",
      },
    ])
    const { ctx, run } = makeCtx(snap, 0)
    await agentBackend.onHold?.(ctx)
    const cmd = run.mock.calls[0]?.[0] as string
    expect(cmd).toContain("claude --resume")
    expect(cmd).toContain("xyz")
    expect(cmd).toContain("/w/d")
  })

  it("dbl-tap dismisses the slot agent's attention", () => {
    const snap = snapshot([
      {
        sessionId: "abc",
        providerId: "opencode",
        status: "waiting_for_human",
      },
    ])
    const { ctx } = makeCtx(snap, 0)
    agentBackend.onDblTap?.(ctx)
    const dismiss = (
      ctx as unknown as {
        methods: Record<string, ReturnType<typeof vi.fn>>
      }
    ).methods["coding-agents:dismissAttention"]
    expect(dismiss).toHaveBeenCalledWith("opencode:abc")
  })

  it("does nothing when the slot has no agent", async () => {
    const snap = snapshot([])
    const { ctx, run } = makeCtx(snap, 0)
    await agentBackend.onTap?.(ctx)
    await agentBackend.onHold?.(ctx)
    expect(run).not.toHaveBeenCalled()
  })
})
