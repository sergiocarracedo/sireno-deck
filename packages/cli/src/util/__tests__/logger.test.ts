import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const loggerModule = await import("../logger")
const { createLogger, createIsServiceMode, isOrphanedToInit } = loggerModule

describe("isServiceMode (factory)", () => {
  const originalEnv = { ...process.env }
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  const check = (orphan: boolean) =>
    createIsServiceMode({ isOrphaned: () => orphan })()

  it("returns false in plain shell", () => {
    delete process.env["INVOCATION_ID"]
    delete process.env["LAUNCH_JOB_NAME"]
    delete process.env["SIRENO_DAEMON_CHILD"]
    expect(check(true)).toBe(false)
    expect(check(false)).toBe(false)
  })

  it("returns true when INVOCATION_ID + JOURNAL_STREAM + orphaned", () => {
    process.env["INVOCATION_ID"] = "abc123"
    process.env["JOURNAL_STREAM"] = "10:100"
    delete process.env["LAUNCH_JOB_NAME"]
    delete process.env["SIRENO_DAEMON_CHILD"]
    expect(check(true)).toBe(true)
  })

  it("returns true when LAUNCH_JOB_NAME is set + orphaned", () => {
    delete process.env["INVOCATION_ID"]
    delete process.env["JOURNAL_STREAM"]
    process.env["LAUNCH_JOB_NAME"] = "com.example.foo"
    delete process.env["SIRENO_DAEMON_CHILD"]
    expect(check(true)).toBe(true)
  })

  it("returns true when SIRENO_DAEMON_CHILD is set (forked by cli)", () => {
    delete process.env["INVOCATION_ID"]
    delete process.env["LAUNCH_JOB_NAME"]
    delete process.env["JOURNAL_STREAM"]
    process.env["SIRENO_DAEMON_CHILD"] = "1"
    expect(check(false)).toBe(true)
  })

  it("returns false when systemd env is set but ppid != 1 (stray env)", () => {
    process.env["INVOCATION_ID"] = "abc123"
    process.env["JOURNAL_STREAM"] = "10:100"
    delete process.env["LAUNCH_JOB_NAME"]
    delete process.env["SIRENO_DAEMON_CHILD"]
    expect(check(false)).toBe(false)
  })

  it("returns false when LAUNCH_JOB_NAME is set but ppid != 1", () => {
    delete process.env["INVOCATION_ID"]
    delete process.env["JOURNAL_STREAM"]
    process.env["LAUNCH_JOB_NAME"] = "com.example.foo"
    delete process.env["SIRENO_DAEMON_CHILD"]
    expect(check(false)).toBe(false)
  })
})

describe("createLogger format selection", () => {
  beforeEach(() => {
    delete process.env["INVOCATION_ID"]
    delete process.env["LAUNCH_JOB_NAME"]
    delete process.env["JOURNAL_STREAM"]
    delete process.env["SIRENO_DAEMON_CHILD"]
  })

  it("emits raw ndjson when json:true", () => {
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      const logger = createLogger({ json: true, level: "info" })
      logger.info("hello")
      const raw = captured.join("")
      const parsed = JSON.parse(raw.trim()) as Record<string, unknown>
      expect(parsed["msg"]).toBe("hello")
      expect(parsed["level"]).toBe(30)
      expect(typeof parsed["time"]).toBe("number")
      expect(parsed["name"]).toBe("sireno-deck")
    } finally {
      process.stdout.write = origWrite
    }
  })

  it("emits raw ndjson under systemd (INVOCATION_ID + JOURNAL_STREAM + orphaned)", () => {
    process.env["INVOCATION_ID"] = "abc"
    process.env["JOURNAL_STREAM"] = "10:100"
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      const logger = createLogger({ level: "info" })
      logger.info({ port: 3939 }, "daemon: started")
      const raw = captured.join("")
      const parsed = JSON.parse(raw.trim()) as Record<string, unknown>
      expect(parsed["msg"]).toBe("daemon: started")
      expect(parsed["port"]).toBe(3939)
    } finally {
      process.stdout.write = origWrite
    }
  })

  it("emits raw ndjson under SIRENO_DAEMON_CHILD", () => {
    process.env["SIRENO_DAEMON_CHILD"] = "1"
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      const logger = createLogger({ level: "info" })
      logger.info("x")
      const parsed = JSON.parse(captured.join("").trim()) as Record<
        string,
        unknown
      >
      expect(parsed["msg"]).toBe("x")
    } finally {
      process.stdout.write = origWrite
    }
  })
})
