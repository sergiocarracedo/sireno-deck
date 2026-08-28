import { describe, expect, it } from "vitest"

import {
  deriveClaudeStatus,
  type ClaudeJsonlEntry,
} from "../shared/claude-status"

const now = 1_700_000_000_000
const ago = (ms: number): string => new Date(now - ms).toISOString()

const toolBlock = (
  id: string,
  name: string,
): { type: string; id: string; name: string } => ({
  type: "tool_use",
  id,
  name,
})

const result = (id: string): { type: string; tool_use_id: string } => ({
  type: "tool_result",
  tool_use_id: id,
})

describe("deriveClaudeStatus", () => {
  it("returns null for empty entries", () => {
    expect(deriveClaudeStatus([], now)).toBeNull()
  })

  it("returns idle when last entry is a finished turn (system turn_duration)", () => {
    const entries: ClaudeJsonlEntry[] = [
      { type: "user", timestamp: ago(60_000) },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "world" }],
        },
        timestamp: ago(50_000),
      },
      { type: "system", subtype: "turn_duration", timestamp: ago(45_000) },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("idle")
    expect(r?.preview).toBe("world")
  })

  it("returns waiting_for_human for a pending AskUserQuestion tool_use", () => {
    const entries: ClaudeJsonlEntry[] = [
      { type: "user", timestamp: ago(60_000) },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "I have a question" },
            toolBlock("toolu_ask1", "AskUserQuestion"),
          ],
        },
        timestamp: ago(5_000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("waiting_for_human")
  })

  it("returns running while a non-question tool is still open and fresh", () => {
    const entries: ClaudeJsonlEntry[] = [
      { type: "user", timestamp: ago(60_000) },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [toolBlock("toolu1", "Bash")],
        },
        timestamp: ago(10_000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("running")
    expect(r?.preview).toContain("Bash")
  })

  it("returns waiting once a pending non-ask tool stalls past the threshold", () => {
    const entries: ClaudeJsonlEntry[] = [
      { type: "user", timestamp: ago(5 * 60 * 1000) },
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [toolBlock("toolu2", "Bash")],
        },
        timestamp: ago(120 * 1000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("waiting")
  })

  it("resolves a pending tool when a tool_result follows", () => {
    const entries: ClaudeJsonlEntry[] = [
      {
        type: "assistant",
        message: { role: "assistant", content: [toolBlock("tu9", "Read")] },
        timestamp: ago(60_000),
      },
      {
        type: "user",
        message: { role: "user", content: [result("tu9")] },
        timestamp: ago(50_000),
      },
      {
        type: "assistant",
        message: { role: "assistant", content: [] },
        timestamp: ago(5_000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("idle")
  })

  it("returns running when last entry is progress (streaming/tool in flight)", () => {
    const entries: ClaudeJsonlEntry[] = [
      {
        type: "assistant",
        message: { role: "assistant", content: [toolBlock("tu3", "Bash")] },
        timestamp: ago(20_000),
      },
      { type: "progress", timestamp: ago(5_000) },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.status).toBe("running")
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

  it("sums costUSD across assistant entries and derives cwd + createdAt", () => {
    const entries: ClaudeJsonlEntry[] = [
      { type: "user", timestamp: ago(60_000), cwd: "/home/sergio/foo" },
      {
        type: "assistant",
        message: { role: "assistant", content: "a" },
        timestamp: ago(50_000),
        costUSD: 0.1,
      },
      {
        type: "assistant",
        message: { role: "assistant", content: "b" },
        timestamp: ago(40_000),
        costUSD: 0.05,
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.cost).toBeCloseTo(0.15, 5)
    expect(r?.cwd).toBe("/home/sergio/foo")
    expect(r?.createdAt).toBe(now - 60_000)
  })

  it("omits cost when absent", () => {
    const entries: ClaudeJsonlEntry[] = [
      { type: "user", timestamp: ago(60_000), cwd: "/tmp/x" },
      {
        type: "assistant",
        message: { role: "assistant", content: "a" },
        timestamp: ago(40_000),
      },
    ]
    const r = deriveClaudeStatus(entries, now)
    expect(r?.cost).toBeUndefined()
    expect(r?.cwd).toBe("/tmp/x")
  })
})
