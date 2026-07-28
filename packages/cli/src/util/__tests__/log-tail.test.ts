import {
  appendFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { tailFile, tailLogs } from "../log-tail"

const TEST_DIR = join(tmpdir(), `sireno-deck-logtail-${process.pid}`)

describe("tailFile", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(TEST_DIR, { recursive: true })
  })
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  const writeLine = (path: string, msg: string): void => {
    appendFileSync(
      path,
      `${JSON.stringify({ level: 30, time: Date.now(), msg })}\n`,
      "utf8",
    )
  }

  it("emits formatted human lines from a non-following tail", async () => {
    const path = join(TEST_DIR, "service.log")
    writeLine(path, "hello")
    writeLine(path, "world")
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      await tailLogs({ logPath: path, follow: false, lines: 10 })
      const out = captured.join("")
      expect(out).toContain("INFO")
      expect(out).toContain("hello")
      expect(out).toContain("world")
      expect(out).not.toContain('"level":30')
    } finally {
      process.stdout.write = origWrite
    }
  })

  it("follows new appended lines and exits on stop()", async () => {
    const path = join(TEST_DIR, "service.log")
    writeLine(path, "first")
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      const handle = tailFile({ logPath: path, follow: true, pollMs: 50 })
      writeLine(path, "second")
      await new Promise((r) => setTimeout(r, 150))
      handle.stop()
      await handle.promise
      const out = captured.join("")
      expect(out).toContain("first")
      expect(out).toContain("second")
    } finally {
      process.stdout.write = origWrite
    }
  })

  it("survives log truncation/rotation by resetting the offset", async () => {
    const path = join(TEST_DIR, "service.log")
    writeLine(path, "before")
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      const handle = tailFile({ logPath: path, follow: true, pollMs: 50 })
      writeFileSync(
        path,
        `${JSON.stringify({ level: 30, time: 1, msg: "after" })}\n`,
        "utf8",
      )
      await new Promise((r) => setTimeout(r, 150))
      handle.stop()
      await handle.promise
      const out = captured.join("")
      expect(out).toContain("after")
    } finally {
      process.stdout.write = origWrite
    }
  })

  it("no-op when the file does not exist", async () => {
    const path = join(TEST_DIR, "missing.log")
    await expect(
      tailLogs({ logPath: path, follow: false }),
    ).resolves.toBeUndefined()
  })

  it("honors the --lines buffer count for the initial dump", async () => {
    const path = join(TEST_DIR, "service.log")
    for (let i = 0; i < 10; i++) writeLine(path, `m${i}`)
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      await tailLogs({ logPath: path, follow: false, lines: 3 })
      const out = captured.join("")
      expect(out).toContain("m7")
      expect(out).toContain("m8")
      expect(out).toContain("m9")
      expect(out).not.toContain("m6")
    } finally {
      process.stdout.write = origWrite
    }
  })
})
