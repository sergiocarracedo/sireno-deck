import { describe, expect, it } from "vitest"

import {
  appendServiceLog,
  appendBridgeMessage,
  clearServiceLogs,
  clearBridgeMessages,
  getServiceLogs,
  getBridgeMessages,
} from "../bridge-log-store"

describe("service-log ring buffer", () => {
  it("caps at 1000 entries (oldest evicted)", () => {
    clearServiceLogs()
    for (let i = 0; i < 1500; i++) {
      appendServiceLog({ ts: i, level: "info", msg: `msg-${i}` })
    }
    const all = getServiceLogs()
    expect(all.length).toBe(1000)
    expect(all[0]?.msg).toBe("msg-500")
    expect(all[999]?.msg).toBe("msg-1499")
  })

  it("filters by level", () => {
    clearServiceLogs()
    appendServiceLog({ ts: 1, level: "info", msg: "a" })
    appendServiceLog({ ts: 2, level: "error", msg: "b" })
    appendServiceLog({ ts: 3, level: "info", msg: "c" })
    expect(getServiceLogs({ level: "error" }).length).toBe(1)
    expect(getServiceLogs({ level: "info" }).length).toBe(2)
  })

  it("filters by sinceMs", () => {
    clearServiceLogs()
    appendServiceLog({ ts: 100, level: "info", msg: "old" })
    appendServiceLog({ ts: 200, level: "info", msg: "new" })
    expect(getServiceLogs({ sinceMs: 150 }).length).toBe(1)
  })

  it("filters by contentSubstring", () => {
    clearServiceLogs()
    appendServiceLog({ ts: 1, level: "info", msg: "hello world" })
    appendServiceLog({ ts: 2, level: "info", msg: "goodbye" })
    expect(getServiceLogs({ contentSubstring: "hello" }).length).toBe(1)
  })

  it("clears all entries", () => {
    clearServiceLogs()
    appendServiceLog({ ts: 1, level: "info", msg: "x" })
    clearServiceLogs()
    expect(getServiceLogs().length).toBe(0)
  })
})

describe("bridge-message ring buffer", () => {
  it("caps at 1000 entries", () => {
    clearBridgeMessages()
    for (let i = 0; i < 1200; i++) {
      appendBridgeMessage({
        ts: i,
        direction: "received",
        type: "deck-config",
        channel: null,
        payload: { i },
      })
    }
    expect(getBridgeMessages().length).toBe(1000)
  })

  it("filters by direction", () => {
    clearBridgeMessages()
    appendBridgeMessage({
      ts: 1,
      direction: "sent",
      type: "hello",
      channel: null,
      payload: {},
    })
    appendBridgeMessage({
      ts: 2,
      direction: "received",
      type: "deck-config",
      channel: null,
      payload: {},
    })
    expect(getBridgeMessages({ direction: "sent" }).length).toBe(1)
    expect(getBridgeMessages({ direction: "received" }).length).toBe(1)
  })

  it("filters by type", () => {
    clearBridgeMessages()
    appendBridgeMessage({
      ts: 1,
      direction: "sent",
      type: "hello",
      channel: null,
      payload: {},
    })
    appendBridgeMessage({
      ts: 2,
      direction: "received",
      type: "deck-config",
      channel: null,
      payload: {},
    })
    expect(getBridgeMessages({ type: "deck-config" }).length).toBe(1)
  })
})
