import { describe, expect, it } from "vitest"

import {
  deriveClaudeStatus,
  type ClaudeJsonlEntry,
} from "../shared/claude-status"

const now = 1_700_000_000_000
const ago = (ms: number): string => new Date(now - ms).toISOString()

describe("deriveClaudeStatus", () => {
  it("returns null for empty entries", () => {
    expect(deriveClaudeStatus([], now)).toBeNull()
  })

  it("returns running for assistant with no pending tool_use", () => {
    const entries: ClaudeJsonlEntry[] = [
      {
        type: "user",
        message: { role: "user", content: "hello" },
        timestamp: ago(60_000),
      },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "world" }],
        },
        timestamp: ago(50_000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("running")
    expect(r?.preview).toBe("world")
  })

  it("returns waiting when last assistant has pending tool_use", () => {
    // ponytail: helper inspects toolUse on entries via duck typing — make
    // the synthetic entry match.
    const synth = [
      {
        type: "assistant",
        message: { role: "assistant", content: "calling tool" },
        toolUse: { id: "tu1" },
        timestamp: ago(20_000),
      },
    ] as unknown as ClaudeJsonlEntry[]
    const r = deriveClaudeStatus(synth, now)
    expect(r?.status).toBe("waiting")
  })

  it("returns waiting_for_human on permission_request", () => {
    const entries: ClaudeJsonlEntry[] = [
      {
        type: "assistant",
        timestamp: ago(20_000),
      },
      {
        type: "permission_request",
        timestamp: ago(5_000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("waiting_for_human")
  })

  it("returns error on error entry", () => {
    const entries: ClaudeJsonlEntry[] = [
      { type: "user", timestamp: ago(60_000) },
      {
        type: "error",
        error: { message: "boom" },
        timestamp: ago(2_000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("error")
    expect(r?.preview).toBe("boom")
  })

  it("returns idle when nothing recent", () => {
    const entries: ClaudeJsonlEntry[] = [
      {
        type: "assistant",
        message: { role: "assistant", content: "old" },
        timestamp: ago(45 * 60 * 1000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("idle")
  })
})
