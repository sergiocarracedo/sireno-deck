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
  it("orders by creation date desc across providers", () => {
    const snap = mergeSnapshot(EMPTY_SNAPSHOT, {
      opencode: [
        agent({ sessionId: "new", createdAt: 300, updatedAt: 100 }),
        agent({ sessionId: "old", createdAt: 100, updatedAt: 999 }),
      ],
      "claude-code": [
        agent({
          sessionId: "mid",
          providerId: "claude-code",
          createdAt: 200,
        }),
      ],
    })
    expect(agentAtSlot(snap, 0)?.sessionId).toBe("new")
    expect(agentAtSlot(snap, 1)?.sessionId).toBe("mid")
    expect(agentAtSlot(snap, 2)?.sessionId).toBe("old")
    expect(agentAtSlot(snap, 99)).toBeUndefined()
  })

  it("falls back to updatedAt when createdAt is missing", () => {
    const snap = mergeSnapshot(EMPTY_SNAPSHOT, {
      opencode: [
        agent({ sessionId: "a", updatedAt: 100 }),
        agent({ sessionId: "b", updatedAt: 200 }),
      ],
      "claude-code": [],
    })
    expect(agentAtSlot(snap, 0)?.sessionId).toBe("b")
    expect(agentAtSlot(snap, 1)?.sessionId).toBe("a")
  })
})
