import { describe, expect, it } from "vitest"

import actionButtonsTestDeck from "../decks/action-buttons-test"

const deck = actionButtonsTestDeck as {
  id: string
  name: string
  icon: string
  buttons: ReadonlyArray<{
    type: string
    position?: number
    config?: Record<string, unknown>
  }>
}

describe("test-buildin:action-buttons-test deck", () => {
  it("is defined as a static deck entry", () => {
    expect(actionButtonsTestDeck).toBeDefined()
    expect(deck.id).toBe("test-buildin:action-buttons-test")
    expect(deck.name).toBe("Action Buttons Test")
    expect(deck.icon).toBe("🧪")
  })

  it("contains one button per icon-source shape", () => {
    const buttons = deck.buttons
    // 10 cases fill positions 0..9 on an mk2 (15 keys). The injected
    // core:back button can occupy any position 10..14.
    expect(buttons).toHaveLength(10)
    const positions = buttons
      .map((b) => b.position)
      .sort((a, b) => (a ?? 0) - (b ?? 0))
    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it("uses core:action for every button (no custom backend needed)", () => {
    for (const b of deck.buttons) {
      expect(b.type).toBe("core:action")
    }
  })

  it("includes a representative sample of every accepted icon source shape", () => {
    const icons = deck.buttons.map((b) => b.config?.icon)

    // Lucide / icon://
    expect(icons).toContain("icon://play")
    // Addon / asset path
    expect(icons).toContain("addon://emoji-selector/assets/smileys.svg")
    // Single emoji (Presentation)
    expect(icons).toContain("🔥")
    // Single emoji (base+VS16)
    expect(icons).toContain("✈️")
    // Empty / label-only button — config has no `icon` key at all.
    expect(icons).toContain(undefined)
  })

  it("includes invalid shapes to exercise the runtime fallback", () => {
    const icons = deck.buttons.map((b) => b.config?.icon as string | undefined)
    expect(icons).toContain("icon://")
    expect(icons.some((i) => i?.startsWith("data:"))).toBe(true)
  })
})
