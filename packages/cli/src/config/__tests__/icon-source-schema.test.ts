import { describe, expect, it } from "vitest"

import { IconSourceSchema, ButtonDefSchema, DeckDefSchema } from "../schemas"
import { configSchema as ActionConfigSchema } from "@/builtin-addons/core/buttons/action/config"

const VALID_ICONS = [
  "icon://arrow-left",
  "icon://settings",
  "icon://alert-circle",
  "asset://abc123def",
  "🔥",
  "🎉",
  "✈️", // base + VS16
  "⌚", // \p{Emoji_Presentation}
  "❤️", // variation selector
] as const

const INVALID_ICONS = [
  "",
  "%",
  "abc",
  "abc🔥", // multi-char with emoji
  "🔥🔥", // two emojis
  "icon://", // empty name
  "asset://", // empty id
  "./foo.svg", // raw path
  "/abs/foo.svg",
  "data:image/png;base64,AAAA",
  "http://example.com/x.png",
  "addon://demo/icon.svg", // not allowed at runtime
] as const

describe("IconSourceSchema", () => {
  for (const icon of VALID_ICONS) {
    it(`accepts ${icon}`, () => {
      const result = IconSourceSchema.safeParse(icon)
      expect(result.success, JSON.stringify(result)).toBe(true)
    })
  }

  for (const icon of INVALID_ICONS) {
    it(`rejects ${JSON.stringify(icon)}`, () => {
      const result = IconSourceSchema.safeParse(icon)
      expect(result.success).toBe(false)
    })
  }
})

describe("ButtonDefSchema — icon field", () => {
  it("accepts a valid icon in config (record-shaped, validated by addon)", () => {
    // The ButtonDefSchema leaves config as a generic record; the icon
    // shape is enforced by each addon's configSchema (now using
    // IconSourceSchema). This test confirms the schema accepts an
    // arbitrary record-shaped config without trying to second-guess the
    // addon's stricter rules.
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
      config: { icon: "🔥" },
    })
    expect(result.success).toBe(true)
  })

  it("accepts a button without an icon", () => {
    const result = ButtonDefSchema.safeParse({
      position: 0,
      type: "core:action",
    })
    expect(result.success).toBe(true)
  })
})

describe("DeckDefSchema — icon field", () => {
  it("accepts a valid deck icon (emoji)", () => {
    const result = DeckDefSchema.safeParse({
      name: "Test",
      icon: "🚀",
      buttons: [],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid deck icon", () => {
    const result = DeckDefSchema.safeParse({
      name: "Test",
      icon: "%",
      buttons: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("core:action configSchema (uses IconSourceSchema)", () => {
  // The addon configSchema is what validateFull runs per-button.
  it("accepts icon://", () => {
    const r = ActionConfigSchema.safeParse({ icon: "icon://play" })
    expect(r.success).toBe(true)
  })

  it("accepts a single emoji", () => {
    const r = ActionConfigSchema.safeParse({ icon: "🔥" })
    expect(r.success).toBe(true)
  })

  it("rejects a raw path", () => {
    const r = ActionConfigSchema.safeParse({ icon: "./foo.svg" })
    expect(r.success).toBe(false)
  })

  it("rejects a multi-char string", () => {
    const r = ActionConfigSchema.safeParse({ icon: "abc" })
    expect(r.success).toBe(false)
  })
})