import { describe, expect, it } from "vitest"

import { configSchema } from "../config"

describe("coding-agents:summary config schema", () => {
  it("defaults fallingLetters to true", () => {
    const result = configSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fallingLetters).toBe(true)
    }
  })

  it("honors fallingLetters: false", () => {
    const result = configSchema.safeParse({ fallingLetters: false })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fallingLetters).toBe(false)
    }
  })

  it("rejects unknown keys", () => {
    const result = configSchema.safeParse({ bogus: 1 })
    expect(result.success).toBe(false)
  })
})
