import { describe, expect, it } from "vitest"

import { agentKey, notifiableStatus } from "../shared/state"

describe("shared state helpers", () => {
  it("agentKey combines provider + session", () => {
    expect(agentKey({ providerId: "opencode", sessionId: "abc" })).toBe(
      "opencode:abc",
    )
    expect(agentKey({ providerId: "claude-code", sessionId: "xyz" })).toBe(
      "claude-code:xyz",
    )
  })

  it("notifiableStatus marks attention states only", () => {
    expect(notifiableStatus("waiting_for_human")).toBe(true)
    expect(notifiableStatus("error")).toBe(true)
    expect(notifiableStatus("running")).toBe(false)
    expect(notifiableStatus("idle")).toBe(false)
    expect(notifiableStatus("waiting")).toBe(false)
    expect(notifiableStatus("compacting")).toBe(false)
  })
})
