import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { ClaudeCodeProvider, mergeLeases } from "../providers/claude-code.js"

const UUID_A = "cc0b6a72-35c7-4578-b82d-db4e25930541"
const UUID_B = "884f6c23-ba9d-4f4e-83a9-9e4e43c23136"

const entry = (o: Record<string, unknown>): string => JSON.stringify(o)

const line = (type: string, text: string, ts = new Date().toISOString()) =>
  entry({
    type,
    timestamp: ts,
    cwd: "/work/proj",
    message: { role: type, content: [{ type: "text", text }] },
  })

let root: string
const makeRoot = (): string => {
  root = mkdtempSync(join(tmpdir(), "cc-projects-"))
  return root
}

const write = (rel: string, body: string, ageMs = 0): string => {
  const full = join(root, rel)
  mkdirSync(join(full, ".."), { recursive: true })
  writeFileSync(full, body)
  if (ageMs > 0) {
    const t = (Date.now() - ageMs) / 1000
    utimesSync(full, t, t)
  }
  return full
}

const snapshot = async (provider: ClaudeCodeProvider) =>
  provider.fetchSnapshot(new AbortController().signal)

afterEach(() => {
  root = ""
})

describe("ClaudeCodeProvider", () => {
  it("finds sessions without subscribe() ever being called", async () => {
    // ponytail: the regression that started all this. The agent map was filled
    // only inside subscribe(), and the host never invoked subscriptions, so the
    // provider reported zero sessions forever. fetchSnapshot must stand alone.
    makeRoot()
    write(`proj/${UUID_A}.jsonl`, `${line("user", "hi")}\n`)
    const agents = await snapshot(
      new ClaudeCodeProvider({ projectsDir: root, readLeases: false }),
    )
    expect(agents).toHaveLength(1)
    expect(agents[0]!.sessionId).toBe(UUID_A)
  })

  it("ignores subagent and orphaned transcripts", async () => {
    // 56 of 105 files on the reporting machine were subagent transcripts; each
    // would otherwise have become its own agent tile.
    makeRoot()
    write(`proj/${UUID_A}.jsonl`, `${line("user", "real")}\n`)
    write(
      `proj/${UUID_A}/subagents/agent-acd8a03dca4f8b3d8.jsonl`,
      `${line("user", "subagent")}\n`,
    )
    write(
      `proj/${UUID_B}.orphaned-1789-abc.jsonl`,
      `${line("user", "orphan")}\n`,
    )
    const agents = await snapshot(
      new ClaudeCodeProvider({ projectsDir: root, readLeases: false }),
    )
    expect(agents.map((a) => a.sessionId)).toEqual([UUID_A])
  })

  it("excludes a transcript by mtime even when its contents look fresh", () => {
    // This pins the perf fix. Candidates are chosen by mtime BEFORE any file
    // is opened — the old ingest read all 105 files (136 MB) and judged
    // recency from in-file timestamps, so a stale file with fresh-looking
    // contents was read and kept. Here the stale file carries a current
    // timestamp inside; only its mtime is old, and it must not appear.
    makeRoot()
    write(`proj/${UUID_A}.jsonl`, `${line("user", "fresh")}\n`)
    write(
      `proj/${UUID_B}.jsonl`,
      `${line("user", "looks fresh inside")}\n`,
      48 * 60 * 60 * 1000,
    )
    return snapshot(
      new ClaudeCodeProvider({ projectsDir: root, readLeases: false }),
    ).then((agents) => {
      expect(agents.map((a) => a.sessionId)).toEqual([UUID_A])
    })
  })

  it("reads only the tail of a large transcript", async () => {
    makeRoot()
    // 1 MB of junk the parser must not choke on, then the real lines.
    const junk = `${"x".repeat(1024)}\n`.repeat(1024)
    write(
      `proj/${UUID_A}.jsonl`,
      junk + `${line("user", "q")}\n${line("assistant", "the answer")}\n`,
    )
    const agents = await snapshot(
      new ClaudeCodeProvider({ projectsDir: root, readLeases: false }),
    )
    expect(agents).toHaveLength(1)
    expect(agents[0]!.status).toBe("idle")
  })

  it("dates a transcript with no timestamps by its mtime, not now", async () => {
    // Such files existed on the reporting machine and showed as permanently
    // live because the fallback was Date.now().
    makeRoot()
    write(
      `proj/${UUID_A}.jsonl`,
      `${entry({ type: "user", message: { role: "user", content: "no ts" } })}\n`,
      48 * 60 * 60 * 1000,
    )
    const agents = await snapshot(
      new ClaudeCodeProvider({ projectsDir: root, readLeases: false }),
    )
    expect(agents).toHaveLength(0)
  })

  it("extracts context tokens from message.usage", async () => {
    makeRoot()
    write(
      `proj/${UUID_A}.jsonl`,
      [
        line("user", "q"),
        entry({
          type: "assistant",
          timestamp: new Date().toISOString(),
          cwd: "/work/proj",
          isSidechain: false,
          message: {
            role: "assistant",
            content: [{ type: "text", text: "a" }],
            usage: {
              input_tokens: 2,
              cache_creation_input_tokens: 3579,
              cache_read_input_tokens: 332182,
              output_tokens: 2160,
            },
          },
        }),
      ].join("\n") + "\n",
    )
    const agents = await snapshot(
      new ClaudeCodeProvider({ projectsDir: root, readLeases: false }),
    )
    expect(agents[0]!.contextTokens).toBe(2 + 3579 + 332182 + 2160)
    // No reliable window size is knowable from the model string, so no percent.
    expect(agents[0]!.contextPercent).toBeUndefined()
  })
})

describe("mergeLeases", () => {
  const transcriptAgent = {
    sessionId: UUID_A,
    providerId: "claude-code" as const,
    title: "fix the thing",
    status: "idle" as const,
    updatedAt: 1_000,
    contextTokens: 4242,
    lastMessagePreview: "done",
    directory: "/stale/dir",
  }

  const leaseFor = (over: Record<string, unknown> = {}) => ({
    instanceId: `claude:${UUID_A}`,
    sessionId: UUID_A,
    pid: 4242,
    cwd: "/real/dir",
    status: "waiting_for_human" as const,
    updatedAt: 2_000,
    ...over,
  })

  it("produces exactly one agent when both sources see a session", () => {
    // ponytail: the summary tile counts by flattening every provider's list,
    // so a duplicate here would be counted twice on the deck.
    const merged = mergeLeases([transcriptAgent], [leaseFor()])
    expect(merged).toHaveLength(1)
    const agent = merged[0]!
    // Lease is authoritative for what it observes first-hand...
    expect(agent.status).toBe("waiting_for_human")
    expect(agent.directory).toBe("/real/dir")
    expect(agent.instanceId).toBe(`claude:${UUID_A}`)
    expect(agent.pid).toBe(4242)
    // ...the transcript keeps what only it has.
    expect(agent.title).toBe("fix the thing")
    expect(agent.contextTokens).toBe(4242)
    expect(agent.updatedAt).toBe(2_000)
  })

  it("surfaces a lease whose transcript has not been written yet", () => {
    const merged = mergeLeases([], [leaseFor()])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.title).toBe("dir")
    expect(merged[0]!.status).toBe("waiting_for_human")
  })

  it("leaves transcript-only sessions untouched when no hook is installed", () => {
    const merged = mergeLeases([transcriptAgent], [])
    expect(merged).toEqual([transcriptAgent])
  })

  it("keeps the newer timestamp from either side", () => {
    const merged = mergeLeases(
      [{ ...transcriptAgent, updatedAt: 9_000 }],
      [leaseFor({ updatedAt: 2_000 })],
    )
    expect(merged[0]!.updatedAt).toBe(9_000)
  })
})
