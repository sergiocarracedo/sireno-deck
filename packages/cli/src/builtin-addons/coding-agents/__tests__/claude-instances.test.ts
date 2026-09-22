import { mkdtempSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { readClaudeInstances } from "../providers/claude-instances.js"

const DEAD_PID = 4_194_303 // above the default macOS/Linux pid ceiling

const dir = (): string => mkdtempSync(join(tmpdir(), "cc-leases-"))

const lease = (
  d: string,
  sessionId: string,
  over: Record<string, unknown> = {},
): void => {
  writeFileSync(
    join(d, `claude-${sessionId}.json`),
    JSON.stringify({
      v: 1,
      harness: "claude-code",
      sessionId,
      pid: process.pid,
      cwd: "/work/proj",
      state: "running",
      updatedAt: Date.now(),
      ...over,
    }),
  )
}

describe("readClaudeInstances", () => {
  it("returns a live lease", async () => {
    const d = dir()
    lease(d, "s1")
    const got = await readClaudeInstances({ dir: d })
    expect(got).toHaveLength(1)
    expect(got[0]!.instanceId).toBe("claude:s1")
    expect(got[0]!.status).toBe("running")
  })

  it("ignores malformed json and unknown states", async () => {
    const d = dir()
    writeFileSync(join(d, "claude-bad.json"), "{not json")
    lease(d, "s2", { state: "banana" })
    expect(await readClaudeInstances({ dir: d })).toHaveLength(0)
  })

  it("drops a lease whose process is gone", async () => {
    const d = dir()
    lease(d, "s3", { pid: DEAD_PID })
    expect(await readClaudeInstances({ dir: d })).toHaveLength(0)
  })

  it("keeps an idle lease indefinitely", async () => {
    // Hooks are event-driven: an idle session writes nothing for hours, so age
    // alone must not mean "dead".
    const d = dir()
    lease(d, "s4", {
      state: "idle",
      updatedAt: Date.now() - 3 * 60 * 60 * 1000,
    })
    const got = await readClaudeInstances({ dir: d })
    expect(got).toHaveLength(1)
    expect(got[0]!.status).toBe("idle")
  })

  it("downgrades a stale running lease to idle rather than dropping it", async () => {
    const d = dir()
    lease(d, "s5", { updatedAt: Date.now() - 30 * 60 * 1000 })
    const got = await readClaudeInstances({ dir: d })
    expect(got).toHaveLength(1)
    expect(got[0]!.status).toBe("idle")
  })

  it("drops anything past the hard ceiling", async () => {
    const d = dir()
    lease(d, "s6", {
      state: "idle",
      pid: 0,
      updatedAt: Date.now() - 48 * 60 * 60 * 1000,
    })
    expect(await readClaudeInstances({ dir: d })).toHaveLength(0)
  })

  it("keeps a lease with no resolvable pid, bounded by age", async () => {
    const d = dir()
    lease(d, "s7", { pid: null, state: "idle" })
    expect(await readClaudeInstances({ dir: d })).toHaveLength(1)
  })

  it("lifts updatedAt from the transcript mtime", async () => {
    const d = dir()
    const transcript = join(d, "t.jsonl")
    writeFileSync(transcript, "{}\n")
    const old = Date.now() - 60_000
    lease(d, "s8", { updatedAt: old, transcriptPath: transcript })
    const got = await readClaudeInstances({ dir: d })
    expect(got[0]!.updatedAt).toBeGreaterThan(old)
  })

  it("prunes dead leases only when asked", async () => {
    const d = dir()
    lease(d, "s9", { pid: DEAD_PID })
    await readClaudeInstances({ dir: d })
    expect(existsSync(join(d, "claude-s9.json"))).toBe(true)
    await readClaudeInstances({ dir: d, prune: true })
    expect(existsSync(join(d, "claude-s9.json"))).toBe(false)
  })
})
