import { describe, expect, it } from "vitest"

import {
  PROTOCOL_VERSION,
  buttonActionMessageSchema,
  helloMessageSchema,
  wsMessageSchema,
} from "../protocol"

describe("public api re-exports", () => {
  it("exposes protocol version 1", () => {
    expect(PROTOCOL_VERSION).toBe(1)
  })

  it("hello message validates with token", () => {
    const result = helloMessageSchema.safeParse({
      type: "hello",
      version: 1,
      token: "abc",
    })
    expect(result.success).toBe(true)
  })

  it("hello message validates without token (dev mode)", () => {
    const result = helloMessageSchema.safeParse({ type: "hello", version: 1 })
    expect(result.success).toBe(true)
  })

  it("button-action carries gesture enum", () => {
    const tap = buttonActionMessageSchema.safeParse({
      type: "button-action",
      deckId: "main",
      position: 0,
      gesture: "tap",
    })
    expect(tap.success).toBe(true)
    const bad = buttonActionMessageSchema.safeParse({
      type: "button-action",
      deckId: "main",
      position: 0,
      gesture: "swipe",
    })
    expect(bad.success).toBe(false)
  })

  it("wsMessageSchema rejects unknown types", () => {
    const result = wsMessageSchema.safeParse({ type: "snapshot" })
    expect(result.success).toBe(false)
  })
})
