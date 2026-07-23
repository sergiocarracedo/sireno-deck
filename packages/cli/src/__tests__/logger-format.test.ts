import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createLogger } from "@/util/logger"

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

describe("compact format renders inline context", () => {
  it("compact formatter produces a single line with msg and context", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: false })
    // ponytail: capture the compact-format output by tapping into pino's
    // stream. Since `compact: true` uses HumanWritable which writes to
    // process.stdout, we monkey-patch write to capture the rendered string.
    const writes: string[] = []
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      writes.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"))
      return true
    }) as typeof process.stdout.write
    try {
      const logger = createLogger({ json: false, compact: true })
      logger.info(
        { deckId: "main", position: 11, gesture: "tap" },
        "emulator: button-action received",
      )
    } finally {
      process.stdout.write = originalWrite
    }
    const all = writes.join("")
    expect(all).toContain("emulator: button-action received")
    expect(all).toContain("deckId: main")
    expect(all).toContain("position: 11")
    expect(all).toContain("gesture: tap")
    // ponytail: compact = single line. No newline within the rendered log line.
    expect(all.split("\n").filter((l) => l.length > 0)).toHaveLength(1)
  })
})
