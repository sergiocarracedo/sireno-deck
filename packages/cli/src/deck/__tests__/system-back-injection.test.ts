import { describe, expect, it } from "vitest"

import { computeSystemButtonForSlotN1 } from "../system-back-injection"

const deck = (
  overrides: Partial<Parameters<typeof computeSystemButtonForSlotN1>[0]> = {},
) => ({
  id: "d1",
  name: "Deck 1",
  buttons: [],
  ...overrides,
})

const state = (
  overrides: Partial<Parameters<typeof computeSystemButtonForSlotN1>[1]> = {},
) => ({
  navStackDepth: 1,
  hasOverlayDeckAvailable: false,
  ...overrides,
})

describe("computeSystemButtonForSlotN1", () => {
  it("main deck returns settings-entry", () => {
    expect(computeSystemButtonForSlotN1(deck({ isMain: true }), state())).toBe(
      "core:settings-entry",
    )
  })

  it("overlay deck returns overlay-toggle", () => {
    expect(
      computeSystemButtonForSlotN1(deck({ isOverlay: true }), state()),
    ).toBe("core:overlay-toggle")
  })

  it("regular deck with navStackDepth=1 returns back", () => {
    expect(
      computeSystemButtonForSlotN1(deck(), state({ navStackDepth: 1 })),
    ).toBe("core:back")
  })

  it("regular deck with navStackDepth=2 returns back", () => {
    expect(
      computeSystemButtonForSlotN1(deck(), state({ navStackDepth: 2 })),
    ).toBe("core:back")
  })

  it("main deck with overlay available still returns settings-entry", () => {
    expect(
      computeSystemButtonForSlotN1(
        deck({ isMain: true }),
        state({ hasOverlayDeckAvailable: true }),
      ),
    ).toBe("core:settings-entry")
  })

  it("overlay deck with navStackDepth=3 returns overlay-toggle", () => {
    expect(
      computeSystemButtonForSlotN1(
        deck({ isOverlay: true }),
        state({ navStackDepth: 3 }),
      ),
    ).toBe("core:overlay-toggle")
  })
})
