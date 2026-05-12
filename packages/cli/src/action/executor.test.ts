import { describe, expect, it } from "vitest"

import { executeCommand } from "./executor.js"

describe("executeCommand", () => {
  it("captures stdout for successful commands", async () => {
    const result = await executeCommand({ command: "printf 'hello world'" })

    expect(result.failed).toBe(false)
    expect(result.code).toBe(0)
    expect(result.stdout).toBe("hello world")
    expect(result.stderr).toBe("")
  })

  it("classifies non-zero exits as failures", async () => {
    const result = await executeCommand({ command: "printf 'boom' >&2; exit 7" })

    expect(result.failed).toBe(true)
    expect(result.code).toBe(7)
    expect(result.stderr).toBe("boom")
  })

  it("reports timeout failures", async () => {
    const result = await executeCommand({ command: "sleep 1", timeoutMs: 10 })

    expect(result.failed).toBe(true)
    expect(result.timedOut).toBe(true)
  })
})
