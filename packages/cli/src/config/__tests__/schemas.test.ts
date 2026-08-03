import { describe, expect, it } from "vitest"

import {
  ButtonActionsSchema,
  ButtonDefSchema,
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

describe("ButtonDefSchema — variant field", () => {
  it("accepts a variant token name", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
      variant: "warning",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.variant).toBe("warning")
    }
  })

  it("accepts custom theme-declared variants", () => {
    const result = ButtonDefSchema.safeParse({
      position: 1,
      type: "core:action",
      variant: "neon-pink",
    })
    expect(result.success).toBe(true)
  })

  it("accepts button without variant", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty variant string", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
      variant: "",
    })
    expect(result.success).toBe(false)
  })
})

describe("ButtonDefSchema — buttonColor field", () => {
  it.each([
    "blue",
    "green",
    "purple",
    "cyan",
    "magenta",
    "amber",
    "lime",
  ] as const)("accepts buttonColor %s", (color) => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
      buttonColor: color,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.buttonColor).toBe(color)
    }
  })

  it("accepts button without buttonColor", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
    })
    expect(result.success).toBe(true)
  })

  it("rejects theme-extras like neon-pink at the Zod boundary (closed core set)", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
      buttonColor: "neon-pink",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty buttonColor string", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
      buttonColor: "",
    })
    expect(result.success).toBe(false)
  })
})
