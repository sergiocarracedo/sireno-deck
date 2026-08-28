import { describe, expect, it } from "vitest"

import { agentAtSlot, mergeSnapshot } from "../shared/snapshot"
import { EMPTY_SNAPSHOT, type Agent } from "../shared/state"

const agent = (overrides: Partial<Agent> = {}): Agent => ({
  sessionId: "s1",
  providerId: "opencode",
  title: "t",
  status: "running",
  updatedAt: 100,
  ...overrides,
})

describe("mergeSnapshot", () => {
  it("preserves order by updatedAt desc", () => {
    const next = mergeSnapshot(EMPTY_SNAPSHOT, {
      opencode: [
        agent({ sessionId: "a", updatedAt: 100 }),
        agent({ sessionId: "b", updatedAt: 200 }),
        agent({ sessionId: "c", updatedAt: 150 }),
      ],
      "claude-code": [],
    })
    expect(next.byProvider.opencode.map((a) => a.sessionId)).toEqual([
      "b",
      "c",
      "a",
    ])
  })

  it("collects attention sessionIds for waiting_for_human and error", () => {
    const next = mergeSnapshot(EMPTY_SNAPSHOT, {
      opencode: [
        agent({ sessionId: "a", status: "running" }),
        agent({ sessionId: "b", status: "waiting_for_human" }),
        agent({ sessionId: "c", status: "error" }),
      ],
      "claude-code": [],
    })
    expect(new Set(next.attention)).toEqual(
      new Set(["opencode:b", "opencode:c"]),
    )
  })

  it("merges with previous snapshot", () => {
    const seeded = mergeSnapshot(EMPTY_SNAPSHOT, {
      opencode: [agent({ sessionId: "a", status: "running" })],
      "claude-code": [],
    })
    const next = mergeSnapshot(seeded, {
      opencode: [agent({ sessionId: "a", status: "idle", updatedAt: 200 })],
      "claude-code": [agent({ sessionId: "x", providerId: "claude-code" })],
    })
    expect(next.byProvider.opencode).toHaveLength(1)
    expect(next.byProvider.opencode[0]?.status).toBe("idle")
    expect(next.byProvider["claude-code"]).toHaveLength(1)
  })
})

describe("agentAtSlot", () => {
  it("orders active before idle, then by recency, across providers", () => {
    const snap = mergeSnapshot(EMPTY_SNAPSHOT, {
      opencode: [
        agent({ sessionId: "idle-new", status: "idle", updatedAt: 300 }),
        agent({ sessionId: "run", status: "running", updatedAt: 100 }),
      ],
      "claude-code": [
        agent({
          sessionId: "wait",
          providerId: "claude-code",
          status: "waiting_for_human",
          updatedAt: 200,
        }),
      ],
    })
    expect(agentAtSlot(snap, 0)?.sessionId).toBe("wait")
    expect(agentAtSlot(snap, 1)?.sessionId).toBe("run")
    expect(agentAtSlot(snap, 2)?.sessionId).toBe("idle-new")
    expect(agentAtSlot(snap, 99)).toBeUndefined()
  })

  it("floats attention sessions to the top regardless of recency", () => {
    const snap = mergeSnapshot(EMPTY_SNAPSHOT, {
      opencode: [
        agent({ sessionId: "recent", status: "running", updatedAt: 999 }),
        agent({ sessionId: "err", status: "error", updatedAt: 10 }),
      ],
      "claude-code": [],
    })
    expect(agentAtSlot(snap, 0)?.sessionId).toBe("err")
    expect(agentAtSlot(snap, 1)?.sessionId).toBe("recent")
  })
})
