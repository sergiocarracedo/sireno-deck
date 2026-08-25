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

describe("createLogger component binding", () => {
  beforeEach(() => {
    delete process.env["INVOCATION_ID"]
    delete process.env["LAUNCH_JOB_NAME"]
    delete process.env["JOURNAL_STREAM"]
    delete process.env["SIRENO_DAEMON_CHILD"]
  })

  it("binds component as a child logger field when option is set", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: true })
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      const logger = createLogger({ json: false, component: "runtime" })
      logger.info("hello")
    } finally {
      process.stdout.write = origWrite
    }
    const all = captured.join("")
    expect(all).toContain("[runtime]")
  })

  it("forwards curated context fields through the sireno:log event in human mode", async () => {
    Object.defineProperty(process.stdout, "isTTY", { value: true })
    const captured: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Buffer): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    const listener = vi.fn()
    process.on("sireno:log", listener)
    try {
      const logger = createLogger({ json: false, component: "runtime" })
      logger.info(
        {
          deckId: "main",
          position: 4,
          gesture: "tap",
          addonName: "system-status",
        },
        "[runtime] invokeAction resolved",
      )
    } finally {
      process.stdout.write = origWrite
      process.removeListener("sireno:log", listener)
    }
    const writes = captured.join("")
    expect(writes).toContain("[runtime]")
    expect(writes).toContain("invokeAction resolved")
    expect(listener).toHaveBeenCalledTimes(1)
    const payload = listener.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined
    expect(payload).toBeDefined()
    expect(payload?.["msg"]).toBe("[runtime] invokeAction resolved")
    expect(payload?.["component"]).toBe("runtime")
    expect(payload?.["deckId"]).toBe("main")
    expect(payload?.["position"]).toBe(4)
    expect(payload?.["gesture"]).toBe("tap")
    expect(payload?.["addonName"]).toBe("system-status")
  })
})
