import { describe, expect, it } from "vitest"

import { opencodeEventToStatus } from "../shared/opencode-status"

describe("opencodeEventToStatus", () => {
  it("maps busy → running", () => {
    const r = opencodeEventToStatus({
      type: "session.status",
      properties: { sessionID: "abc", status: { type: "busy" } },
    })
    expect(r).toEqual({ status: "running", sessionId: "abc" })
  })

  it("maps idle → idle", () => {
    const r = opencodeEventToStatus({
      type: "session.status",
      properties: { sessionID: "abc", status: { type: "idle" } },
    })
    expect(r).toEqual({ status: "idle", sessionId: "abc" })
  })

  it("maps retry → waiting", () => {
    const r = opencodeEventToStatus({
      type: "session.status",
      properties: {
        sessionID: "abc",
        status: {
          type: "retry",
          attempt: 1,
          message: "rate limited",
          next: 5000,
        },
      },
    })
    expect(r?.status).toBe("waiting")
  })

  it("maps session.idle → idle", () => {
    const r = opencodeEventToStatus({
      type: "session.idle",
      properties: { sessionID: "abc" },
    })
    expect(r).toEqual({ status: "idle", sessionId: "abc" })
  })

  it("maps session.compacted → compacting", () => {
    const r = opencodeEventToStatus({
      type: "session.compacted",
      properties: { sessionID: "abc" },
    })
    expect(r?.status).toBe("compacting")
  })

  it("maps session.error → error", () => {
    const r = opencodeEventToStatus({
      type: "session.error",
      properties: { sessionID: "abc", message: "boom" },
    })
    expect(r?.status).toBe("error")
  })

  it("maps pending permission → waiting_for_human", () => {
    const r = opencodeEventToStatus({
      type: "permission.updated",
      properties: { sessionID: "abc", id: "p1", status: "pending" },
    })
    expect(r).toEqual({ status: "waiting_for_human", sessionId: "abc" })
  })

  it("maps approved permission → idle", () => {
    const r = opencodeEventToStatus({
      type: "permission.updated",
      properties: { sessionID: "abc", id: "p1", status: "approved" },
    })
    expect(r).toEqual({ status: "idle", sessionId: "abc" })
  })

  it("returns null for unknown event types", () => {
    const r = opencodeEventToStatus({
      // @ts-expect-error unknown event type
      type: "session.created",
      properties: { sessionID: "abc" },
    })
    expect(r).toBeNull()
  })
})
