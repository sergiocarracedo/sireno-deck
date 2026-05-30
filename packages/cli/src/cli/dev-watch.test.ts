import { describe, expect, it } from "vitest"

import { resolveDevWatchArgs } from "./dev-watch.js"

describe("resolveDevWatchArgs", () => {
  it("defaults bare cli:dev runs to the real start command", () => {
    expect(resolveDevWatchArgs([])).toEqual([
      "start",
      "--config",
      "config.yml",
    ])
  })

  it("passes forwarded emulate args through untouched", () => {
    expect(resolveDevWatchArgs(["emulate", "--port", "8912"])).toEqual([
      "emulate",
      "--port",
      "8912",
    ])
  })
})
