import { describe, expect, it } from "vitest"

import { ButtonActionsSchema, ButtonDefSchema } from "../schemas"

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
