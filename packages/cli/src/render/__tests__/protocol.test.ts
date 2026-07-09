import { describe, expect, it } from "vitest"

import {
  PROTOCOL_VERSION,
  buttonActionMessageSchema,
  deckActiveMessageSchema,
  deckConfigMessageSchema,
  helloMessageSchema,
  methodCallMessageSchema,
  wsMessageSchema,
} from "../protocol"

describe("ws protocol v1", () => {
  it("hello requires version 1", () => {
    const ok = helloMessageSchema.safeParse({ type: "hello", version: 1 })
    expect(ok.success).toBe(true)
    const bad = helloMessageSchema.safeParse({ type: "hello", version: 2 })
    expect(bad.success).toBe(false)
  })

  it("button-action requires valid gesture", () => {
    expect(
      buttonActionMessageSchema.safeParse({
        type: "button-action",
        deckId: "main",
        position: 0,
        gesture: "tap",
      }).success,
    ).toBe(true)
    expect(
      buttonActionMessageSchema.safeParse({
        type: "button-action",
        deckId: "main",
        position: 0,
        gesture: "press",
      }).success,
    ).toBe(false)
  })

  it("button-action position is non-negative int", () => {
    expect(
      buttonActionMessageSchema.safeParse({
        type: "button-action",
        deckId: "main",
        position: -1,
        gesture: "tap",
      }).success,
    ).toBe(false)
  })

  it("deck-config navMode defaults to regular", () => {
    const result = deckConfigMessageSchema.parse({
      type: "deck-config",
      deckId: "main",
      surfaces: {},
    })
    expect(result.navMode).toBe("regular")
  })

  it("deck-active mode enum", () => {
    const result = deckActiveMessageSchema.safeParse({
      type: "deck-active",
      deckId: "main",
      mode: "navigation",
    })
    expect(result.success).toBe(true)
  })

  it("method-call args default to []", () => {
    const result = methodCallMessageSchema.parse({
      type: "method-call",
      callId: "c1",
      name: "runCommand",
    })
    expect(result.args).toEqual([])
  })

  it("wsMessageSchema is a discriminated union", () => {
    const result = wsMessageSchema.safeParse({
      type: "hello",
      version: PROTOCOL_VERSION,
    })
    expect(result.success).toBe(true)
  })

  it("wsMessageSchema rejects unknown types", () => {
    expect(wsMessageSchema.safeParse({ type: "snapshot" }).success).toBe(false)
  })
})
