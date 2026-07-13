/** @vitest-environment node */
import { describe, expect, it } from "vitest"

import { paginateDeck } from "../paginate-deck"

describe("paginateDeck", () => {
  it("14 items split into 2 pages", () => {
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 14 }, (_, i) => ({
        id: `btn${i}`,
        value: { type: "test:btn", label: `b${i}` },
      })),
      keyCount: 15,
    })
    expect(result.length).toBe(2)
  })

  it("20 items on keyCount=32 fits in 1 page", () => {
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 20 }, (_, i) => ({
        id: `btn${i}`,
        value: { type: "test:btn", label: `b${i}` },
      })),
      keyCount: 32,
    })
    expect(result.length).toBe(1)
    const page1 = result[0]!.deck.buttons as unknown[]
    const page1Any = page1 as Array<Record<string, unknown>>
    expect(page1Any.length).toBe(20)
    const hasPageNav = page1Any.some((b) => b["type"] === "core:page-nav")
    expect(hasPageNav).toBe(false)
  })
})
