import { describe, expect, it } from "vitest"

import { configSchema, isStatusToggleConfig } from "../config"

describe("core:toggle config schema", () => {
  it("accepts legacy { key } with default false", () => {
    const result = configSchema.safeParse({ key: "k" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(isStatusToggleConfig(result.data)).toBe(false)
      if (!isStatusToggleConfig(result.data)) {
        expect(result.data.default).toBe(false)
      }
    }
  })

  it("accepts legacy { key, default: true }", () => {
    const result = configSchema.safeParse({ key: "k", default: true })
    expect(result.success).toBe(true)
  })

  it("accepts a status toggle config with a single state", () => {
    const result = configSchema.safeParse({
      statusCommand: "echo playing",
      states: { playing: { label: "Playing" } },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(isStatusToggleConfig(result.data)).toBe(true)
    }
  })

  it("accepts a status toggle config with multiple states and onTap", () => {
    const result = configSchema.safeParse({
      statusCommand: "playerctl status",
      intervalMs: 1500,
      timeoutMs: 3000,
      states: {
        Playing: {
          label: "<xl>$(playerctl title)</xl>",
          icon: "icon://play",
          onTap: "playerctl pause",
        },
        Paused: {
          label: "Paused",
          icon: "icon://pause",
          onTap: "playerctl play",
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty states record", () => {
    const result = configSchema.safeParse({
      statusCommand: "echo x",
      states: {},
    })
    expect(result.success).toBe(false)
  })

  it("rejects a state with neither label nor icon", () => {
    const result = configSchema.safeParse({
      statusCommand: "echo x",
      states: { empty: {} },
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty statusCommand", () => {
    const result = configSchema.safeParse({
      statusCommand: "",
      states: { a: { label: "A" } },
    })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys in legacy config", () => {
    const result = configSchema.safeParse({ key: "k", bogus: 1 })
    expect(result.success).toBe(false)
  })

  it("rejects unknown keys in status config", () => {
    const result = configSchema.safeParse({
      statusCommand: "echo x",
      states: { a: { label: "A" } },
      bogus: true,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative intervalMs", () => {
    const result = configSchema.safeParse({
      statusCommand: "echo x",
      intervalMs: -1,
      states: { a: { label: "A" } },
    })
    expect(result.success).toBe(false)
  })
})
