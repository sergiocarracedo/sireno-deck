import { describe, expect, it } from "vitest"

import createActionButtonsTestDeck from "../decks/action-buttons-test"

describe("test-buildin:action-buttons-test deck", () => {
  it("is defined as a deck definition", () => {
    const def = createActionButtonsTestDeck()
    expect(def).toBeDefined()
    expect(def.createDecks).toBeTypeOf("function")
    expect(def.type).toBe("test-buildin:action-buttons-test")
  })

  it("creates a deck with one button per icon-source shape", () => {
    const def = createActionButtonsTestDeck()
    const result = def.createDecks({
      config: {},
      deck: { id: "test-buildin:action-buttons-test" },
    })
    expect(Object.keys(result)).toEqual(["action-buttons-test"])
    const deck = result["action-buttons-test"]!
    expect(deck.name).toBe("Action Buttons Test")
    expect(deck.icon).toBe("🧪")
    const buttons = deck.buttons as ReadonlyArray<{
      type: string
      position?: number
      config?: Record<string, unknown>
    }>
    // 15 cases fill positions 0..14 on an mk2 (15 keys). The injected
    // core:back button is suppressed because position 14 is already taken.
    expect(buttons).toHaveLength(15)
    const positions = buttons
      .map((b) => b.position)
      .sort((a, b) => (a ?? 0) - (b ?? 0))
    expect(positions).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ])
  })

  it("uses core:action for every button (no custom backend needed)", () => {
    const def = createActionButtonsTestDeck()
    const result = def.createDecks({
      config: {},
      deck: { id: "test-buildin:action-buttons-test" },
    })
    const buttons = (result["action-buttons-test"]!.buttons ??
      []) as ReadonlyArray<{
      type: string
    }>
    for (const b of buttons) {
      expect(b.type).toBe("core:action")
    }
  })

  it("includes a representative sample of every accepted icon source shape", () => {
    const def = createActionButtonsTestDeck()
    const result = def.createDecks({
      config: {},
      deck: { id: "test-buildin:action-buttons-test" },
    })
    const buttons = (result["action-buttons-test"]!.buttons ??
      []) as ReadonlyArray<{
      config?: { icon?: string }
    }>
    const icons = buttons.map((b) => b.config?.icon)

    // Lucide / icon://
    expect(icons).toContain("icon://play")
    // Addon / asset path
    expect(icons).toContain("addon://emoji-selector/assets/smileys.svg")
    // Relative path
    expect(icons).toContain("./assets/chrome.svg")
    // Single emoji (Presentation)
    expect(icons).toContain("🔥")
    // Single emoji (base+VS16)
    expect(icons).toContain("✈️")
    // Empty / label-only button — config has no `icon` key at all.
    expect(icons).toContain(undefined)
  })

  it("includes invalid shapes to exercise the runtime fallback", () => {
    const def = createActionButtonsTestDeck()
    const result = def.createDecks({
      config: {},
      deck: { id: "test-buildin:action-buttons-test" },
    })
    const buttons = (result["action-buttons-test"]!.buttons ??
      []) as ReadonlyArray<{
      config?: { icon?: string }
    }>
    const icons = buttons.map((b) => b.config?.icon)
    expect(icons).toContain("%")
    expect(icons).toContain("🔥🔥")
    expect(icons).toContain("icon://")
    expect(icons.some((i) => i?.startsWith("data:"))).toBe(true)
  })
})
