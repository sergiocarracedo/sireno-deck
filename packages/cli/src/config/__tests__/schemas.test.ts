import { describe, expect, it } from "vitest"

import {
  AddonOverlayOverrideSchema,
  ButtonActionsSchema,
  ButtonDefSchema,
  OverlayConfigSchema,
  RawConfigSchema,
} from "../schemas"

describe("ButtonActionsSchema", () => {
  it("accepts valid actions with tap only", () => {
    const result = ButtonActionsSchema.safeParse({ tap: "echo hello" })
    expect(result.success).toBe(true)
  })

  it("accepts all three gestures", () => {
    const result = ButtonActionsSchema.safeParse({
      tap: "echo tap",
      dbltap: "echo dbl",
      hold: "echo hold",
    })
    expect(result.success).toBe(true)
  })

  it("rejects unknown keys (strict)", () => {
    const result = ButtonActionsSchema.safeParse({
      tap: "echo hi",
      unknownKey: "error",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty string tap", () => {
    const result = ButtonActionsSchema.safeParse({ tap: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty string dbltap", () => {
    const result = ButtonActionsSchema.safeParse({ dbltap: "" })
    expect(result.success).toBe(false)
  })

  it("accepts empty object (no actions)", () => {
    const result = ButtonActionsSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe("ButtonDefSchema — full field", () => {
  it("rejects full in user config (internal addon config only)", () => {
    const result = ButtonDefSchema.safeParse({
      type: "core:action",
      full: true,
    })
    expect(result.success).toBe(false)
  })
})

describe("ButtonDefSchema — actions field", () => {
  it("accepts button with actions", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "date-time:date",
      actions: { tap: "notify-send hello" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts button without actions", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "date-time:date",
    })
    expect(result.success).toBe(true)
  })

  it("rejects unknown button keys (strict)", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "date-time:date",
      notAField: "error",
    })
    expect(result.success).toBe(false)
  })
})

describe("OverlayConfigSchema", () => {
  it("accepts a user-defined overlay deck (full def + trigger)", () => {
    const result = OverlayConfigSchema.safeParse({
      myapp: {
        trigger: { process_name: "myapp" },
        autoShow: true,
        buttons: [{ type: "core:action" }],
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts an addon overlay override", () => {
    const result = OverlayConfigSchema.safeParse({
      "chrome-overlay": {
        shortcuts: {
          addon: "chrome-overlay",
          autoShow: false,
          config: { hideTabs: true },
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects unknown keys on addon override (strict)", () => {
    const result = AddonOverlayOverrideSchema.safeParse({
      addon: "x",
      unknown: true,
    })
    expect(result.success).toBe(false)
  })

  it("rejects user overlay deck without trigger", () => {
    const result = OverlayConfigSchema.safeParse({
      bad: { autoShow: true, buttons: [] },
    })
    expect(result.success).toBe(false)
  })

  it("RawConfigSchema accepts overlay at top level", () => {
    const result = RawConfigSchema.safeParse({
      decks: { main: { buttons: [] } },
      overlay: {
        myapp: {
          trigger: { process_name: "myapp" },
          autoShow: true,
          buttons: [],
        },
      },
    })
    expect(result.success).toBe(true)
  })
})
