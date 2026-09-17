import { describe, expect, it } from "vitest"

import { logsCommand } from "@/cli/commands/logs"

describe("logsCommand", () => {
  it("is reachable as `log` as well as `logs`", () => {
    expect(logsCommand.command).toBe("logs")
    expect(logsCommand.aliases).toContain("log")
  })
})
