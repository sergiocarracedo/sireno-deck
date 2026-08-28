import { describe, expect, it } from "vitest"

import { DEFAULT_FAVORITES, EmojiLauncherButtonSchema } from "../support"

describe("EmojiLauncherButtonSchema", () => {
  it("accepts a bare label and defaults it", () => {
    const parsed = EmojiLauncherButtonSchema.parse({})
    expect(parsed.label).toBe("Emojis")
    expect(parsed.favorites).toBeUndefined()
  })

  it("accepts favorites alongside label", () => {
    const parsed = EmojiLauncherButtonSchema.parse({
      label: "Emoji",
      favorites: ["🐱", "🐙"],
    })
    expect(parsed.favorites).toEqual(["🐱", "🐙"])
  })

  it("still rejects unknown keys (strict)", () => {
    expect(() => EmojiLauncherButtonSchema.parse({ random: 1 })).toThrowError(
      /Unrecognized key/,
    )
  })

  it("rejects empty-string favorites", () => {
    expect(() =>
      EmojiLauncherButtonSchema.parse({ favorites: ["🐱", ""] }),
    ).toThrowError()
  })

  it("keeps DEFAULT_FAVORITES distinct for the deck fallback", () => {
    expect(DEFAULT_FAVORITES.length).toBeGreaterThan(0)
  })
})
