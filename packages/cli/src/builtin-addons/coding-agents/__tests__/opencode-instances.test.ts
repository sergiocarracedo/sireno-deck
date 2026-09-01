import { mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  opencodeInstanceDir,
  readOpenCodeInstances,
} from "../providers/opencode-instances"

const previousStateHome = process.env["XDG_STATE_HOME"]

afterEach(async () => {
  if (previousStateHome === undefined) delete process.env["XDG_STATE_HOME"]
  else process.env["XDG_STATE_HOME"] = previousStateHome
})

describe("readOpenCodeInstances", () => {
  it("reads live leases and ignores malformed or stale leases", async () => {
    const stateHome = join(tmpdir(), `sirenodeck-instance-${process.pid}`)
    process.env["XDG_STATE_HOME"] = stateHome
    const dir = opencodeInstanceDir()
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, "opencode-live.json"),
      JSON.stringify({
        pid: process.pid,
        cwd: "/tmp/project",
        state: "waiting_for_human",
        sessionID: "session-1",
        updatedAt: Date.now(),
      }),
    )
    await writeFile(join(dir, "opencode-bad.json"), "not json")
    await writeFile(
      join(dir, "opencode-old.json"),
      JSON.stringify({
        pid: process.pid,
        cwd: "/tmp/old",
        state: "idle",
        updatedAt: 0,
      }),
    )

    await expect(readOpenCodeInstances()).resolves.toEqual([
      expect.objectContaining({
        instanceId: `opencode:${process.pid}`,
        sessionId: "session-1",
        status: "waiting_for_human",
      }),
    ])
    await rm(stateHome, { recursive: true, force: true })
  })

  it("maps OpenCode's working state to running", async () => {
    const stateHome = join(tmpdir(), `sirenodeck-working-${process.pid}`)
    process.env["XDG_STATE_HOME"] = stateHome
    const dir = opencodeInstanceDir()
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, "opencode-working.json"),
      JSON.stringify({
        pid: process.pid,
        cwd: "/tmp/project",
        state: "working",
        updatedAt: Date.now(),
      }),
    )

    await expect(readOpenCodeInstances()).resolves.toEqual([
      expect.objectContaining({ status: "running" }),
    ])
    await rm(stateHome, { recursive: true, force: true })
  })
})
