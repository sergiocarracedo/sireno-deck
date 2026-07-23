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
