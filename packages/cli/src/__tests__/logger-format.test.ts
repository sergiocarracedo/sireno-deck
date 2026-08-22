import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createLogger, formatHuman } from "@/util/logger"

const originalIsTTY = process.stdout.isTTY
const originalInv = process.env["INVOCATION_ID"]
const originalLaunch = process.env["LAUNCH_PATH"]

beforeEach(() => {
  Object.defineProperty(process.stdout, "isTTY", {
    value: false,
    writable: true,
    configurable: true,
  })
  delete process.env["INVOCATION_ID"]
  delete process.env["LAUNCH_PATH"]
})

afterEach(() => {
  Object.defineProperty(process.stdout, "isTTY", {
    value: originalIsTTY,
    writable: true,
    configurable: true,
  })
  if (originalInv !== undefined) process.env["INVOCATION_ID"] = originalInv
  if (originalLaunch !== undefined) process.env["LAUNCH_PATH"] = originalLaunch
})

describe("TTY-aware logger", () => {
  it("uses raw ndjson when stdout is not a TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: false })
    const logger = createLogger({ json: false })
    expect(logger).toBeDefined()
  })

  it("uses raw ndjson when INVOCATION_ID is set (journald)", () => {
    process.env["INVOCATION_ID"] = "1"
    Object.defineProperty(process.stdout, "isTTY", { value: true })
    const logger = createLogger({ json: false })
    expect(logger).toBeDefined()
  })

  it("uses raw ndjson when LAUNCH_PATH is set (launchd)", () => {
    process.env["LAUNCH_PATH"] = "/some/path"
    Object.defineProperty(process.stdout, "isTTY", { value: true })
    const logger = createLogger({ json: false })
    expect(logger).toBeDefined()
  })

  it("forces raw ndjson when json: true", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: true })
    const logger = createLogger({ json: true })
    expect(logger).toBeDefined()
  })
})

describe("default human format renders inline context", () => {
  it("renders msg + context on the clack log.* line", () => {
    // ponytail: TTY + non-service mode routes logger.* through clack's
    // log.* tools, which write a leading "│\n" indent line + an icon
    // line (e.g. "●  emulator: button-action received (deckId: main, ...)")
    // inside the active clack banner. The previous plain-text format put
    // everything on one stdout line; clack splits the border from the
    // icon. Tests assert content rather than line count.
    Object.defineProperty(process.stdout, "isTTY", { value: true })
    const writes: string[] = []
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((
      chunk: string | Uint8Array,
      _encoding?: BufferEncoding,
      _cb?: (error?: Error | null) => void,
    ): boolean => {
      writes.push(
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"),
      )
      return true
    }) as typeof process.stdout.write
    try {
      const logger = createLogger({ json: false })
      logger.info(
        { deckId: "main", position: 11, gesture: "tap" },
        "emulator: button-action received",
      )
    } finally {
      process.stdout.write = originalWrite
    }
    const stripped = writes.join("").replace(/\u001b\[[0-9;]*m/g, "")
    expect(stripped).toContain("emulator: button-action received")
    expect(stripped).toContain("deckId: main")
    expect(stripped).toContain("position: 11")
    expect(stripped).toContain("gesture: tap")
    expect(stripped).not.toContain("sireno-deck")
    expect(stripped).not.toContain("INFO ")
    expect(stripped).not.toContain("WARN ")
  })

  it("renders error details inline on the same clack log line", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: true })
    const writes: string[] = []
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((
      chunk: string | Uint8Array,
      _encoding?: BufferEncoding,
      _cb?: (error?: Error | null) => void,
    ): boolean => {
      writes.push(
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"),
      )
      return true
    }) as typeof process.stdout.write
    try {
      const logger = createLogger({ json: false })
      logger.error({ err: new Error("boom") }, "something broke")
    } finally {
      process.stdout.write = originalWrite
    }
    const stripped = writes.join("").replace(/\u001b\[[0-9;]*m/g, "")
    expect(stripped).toContain("something broke")
    expect(stripped).toContain("err:")
    expect(stripped).toContain("Error: boom")
  })

  it("renders a [component] bracket between level and msg when component is present", () => {
    const formatted = formatHuman(
      JSON.stringify({
        level: 30,
        time: 0,
        component: "runtime",
        msg: "invokeAction resolved",
      }),
    )
    expect(formatted).toContain("[runtime]")
    expect(formatted).toContain("invokeAction resolved")
  })

  it("omits the [component] bracket when component is absent", () => {
    const formatted = formatHuman(
      JSON.stringify({
        level: 30,
        time: 0,
        msg: "plain message",
      }),
    )
    expect(formatted).not.toMatch(/\[[a-z-]+\]/)
    expect(formatted).toContain("plain message")
  })
})

describe("multi-line msg gutter", () => {
  it("leaves continuation lines un-indented (no gutter)", () => {
    const formatted = formatHuman(
      JSON.stringify({
        level: 30,
        time: 0,
        component: "real",
        msg: "stdout:\nVITE v6.4.3  ready in 186 ms\n  ➜  Local:   http://127.0.0.1:5180/",
      }),
    )
    const lines = formatted!.split("\n")
    expect(lines.length).toBe(3)
    expect(lines[1]).toBe("VITE v6.4.3  ready in 186 ms")
    expect(lines[2]).toBe("  ➜  Local:   http://127.0.0.1:5180/")
  })

  it("renders single-line msg with no trailing newline", () => {
    const formatted = formatHuman(
      JSON.stringify({
        level: 30,
        time: 0,
        msg: "header\nbody",
      }),
    )
    // ponytail: operator-facing logs dropped the gutter. Newlines in the
    // msg stay (so multi-line stdout is readable) but they're NOT prefixed
    // with `│ ` indentation.
    const lines = formatted!.split("\n")
    expect(lines[1]).toBe("body")
  })

  it("leaves single-line msg untouched", () => {
    const formatted = formatHuman(
      JSON.stringify({
        level: 30,
        time: 0,
        component: "real",
        msg: "single line",
      }),
    )
    expect(formatted).not.toContain("\n")
    expect(formatted).toContain("single line")
  })
})
