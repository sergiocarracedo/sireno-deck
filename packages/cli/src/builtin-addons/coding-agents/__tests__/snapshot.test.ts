import { describe, expect, it } from "vitest"

import { mergeSnapshot } from "../shared/snapshot"
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
