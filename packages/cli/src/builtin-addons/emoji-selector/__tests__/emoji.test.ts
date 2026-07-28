import { describe, expect, it } from "vitest"

import emojiSelectorDeckFactory from "../decks"

import EmojiBackend from "../buttons/emoji/backend"

const createDeck = (config: unknown = { favorites: [] }) =>
  emojiSelectorDeckFactory.createDecks({
    config,
    deck: { id: "emoji-selector" },
    keyCount: 15,
  })

describe("emoji-selector:emoji backend", () => {
  it("exposes only configSchema (no onTap / no gestureHandlers)", () => {
    expect(EmojiBackend.onTap).toBeUndefined()
    expect(EmojiBackend.onDblTap).toBeUndefined()
    expect(EmojiBackend.onHold).toBeUndefined()
    expect(EmojiBackend.gestureHandlers).toBeUndefined()
    expect(EmojiBackend.configSchema).toBeDefined()
  })

  it("configSchema rejects missing emoji", () => {
    const result = EmojiBackend.configSchema.safeParse({ shortcode: "fire" })
    expect(result.success).toBe(false)
  })

  it("configSchema accepts emoji string", () => {
    const result = EmojiBackend.configSchema.safeParse({
      emoji: "🔥",
      shortcode: "fire",
    })
    expect(result.success).toBe(true)
  })

  it("configSchema accepts flag emoji (multi-codepoint)", () => {
    const result = EmojiBackend.configSchema.safeParse({
      emoji: "🇪🇺",
      shortcode: "eu",
    })
    expect(result.success).toBe(true)
  })

  it("configSchema accepts ZWJ family emoji", () => {
    const result = EmojiBackend.configSchema.safeParse({
      emoji: "👨‍👩‍👧",
      shortcode: "family",
    })
    expect(result.success).toBe(true)
  })

  it("configSchema rejects two emojis concatenated", () => {
    const result = EmojiBackend.configSchema.safeParse({
      emoji: "🔥🔥",
      shortcode: "double",
    })
    expect(result.success).toBe(false)
  })
})

describe("emoji-selector emoji buttons carry actions.tap = type://<emoji>", () => {
  it("emits actions.tap on every favorite when favorites has entries", () => {
    const decks = createDeck({ favorites: ["🦄", "🌈", "🐙"] })
    const favDeck = decks["emoji-selector-favorites"]!
    expect(favDeck.paginated).toBe(true)
    for (const button of favDeck.buttons) {
      expect(button.type).toBe("emoji-selector:emoji")
      const emoji = (button as { emoji: string }).emoji
      expect((button as { actions?: unknown }).actions).toEqual(
        expect.objectContaining({
          tap: `type://${emoji}`,
        }),
      )
    }
  })

  it("emits actions.tap on category deck emoji buttons", () => {
    const decks = createDeck({ favorites: [] })
    const smileysDeck = decks["emoji-selector-smileys"]!
    expect(smileysDeck.paginated).toBe(true)
    const firstButton = smileysDeck.buttons[0]
    expect((firstButton as { emoji?: string }).emoji).toBe("😀")
    expect((firstButton as { actions?: unknown }).actions).toEqual({
      tap: "type://😀",
      dbltap: "type://:grinning:",
    })
  })

  it("multiple category emoji buttons all carry their own type://<emoji> actions", () => {
    const decks = createDeck({ favorites: [] })
    const smileysDeck = decks["emoji-selector-smileys"]!
    const seen = new Map<string, string>()
    for (const button of smileysDeck.buttons) {
      const b = button as { emoji?: string; actions?: { tap?: string } }
      if (b.emoji === undefined) continue
      const tap = b.actions?.tap
      expect(tap).toBe(`type://${b.emoji}`)
      seen.set(b.emoji, tap ?? "")
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})
