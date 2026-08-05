/** @vitest-environment node */
import { describe, expect, it } from "vitest"

import { paginateDeck } from "../paginate-deck"

// ponytail: real runtime buttons are flat objects with a `position`
// field — page = floor(position / (K-2)), slot = position % (K-2).
// n-1 and n-2 on each page stay reserved for system buttons (page-nav
// at K-2, settings at K-1).
const btn = (position: number) => ({
  type: "test:btn",
  label: `b${position}`,
  position,
})

describe("paginateDeck", () => {
  it("14 items split into 2 pages", () => {
    // positions 0..13 on K=15: page 0 (0..12), page 1 (13)
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 14 }, (_, i) => btn(i)),
      keyCount: 15,
    })
    expect(result.length).toBe(2)
  })

  it("20 items on keyCount=32 fits in 1 page", () => {
    // positions 0..19 on K=32: pageSize=30; 20 ≤ 30 → 1 page
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 20 }, (_, i) => btn(i)),
      keyCount: 32,
    })
    expect(result.length).toBe(1)
    const page1 = result[0]!.deck.buttons as Array<Record<string, unknown>>
    const page1Any = page1 as Array<Record<string, unknown>>
    expect(page1Any.length).toBe(20)
    const hasPageNav = page1Any.some((b) => b["type"] === "core:page-nav")
    expect(hasPageNav).toBe(false)
  })

  it("page-nav and last emoji do not collide on page 1 of 14 items (keyCount=15)", () => {
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 14 }, (_, i) => btn(i)),
      keyCount: 15,
    })
    expect(result.length).toBe(2)
    const page1 = result[0]!.deck.buttons as Array<Record<string, unknown>>
    const positions = page1.map((b) => b["position"])
    const uniquePositions = new Set(positions)
    expect(uniquePositions.size).toBe(page1.length)
    const lastEmoji = page1.find(
      (b) => b["label"] === "b12" && b["type"] === "test:btn",
    )
    const pageNav = page1.find((b) => b["type"] === "core:page-nav")
    expect(lastEmoji).toBeDefined()
    expect(pageNav).toBeDefined()
    expect(lastEmoji!["position"]).not.toBe(pageNav!["position"])
    expect(pageNav!["position"]).toBe(13)
    expect(lastEmoji!["position"]).toBe(12)
  })

  it("last page also gets a page-nav for going back (keyCount=15, 14 items)", () => {
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 14 }, (_, i) => btn(i)),
      keyCount: 15,
    })
    const page2 = result[1]!.deck.buttons as Array<Record<string, unknown>>
    const pageNav = page2.find((b) => b["type"] === "core:page-nav")
    expect(pageNav).toBeDefined()
    expect(pageNav!["position"]).toBe(13)
    const config = pageNav!["config"] as Record<string, unknown>
    expect(config["prevDeckId"]).toBe("deck-p1")
  })

  it("single page (13 items, pageSize 13) has no page-nav", () => {
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 13 }, (_, i) => btn(i)),
      keyCount: 15,
    })
    expect(result).toHaveLength(1)
    const pageNav = (
      result[0]!.deck.buttons as Array<Record<string, unknown>>
    ).find((b) => b["type"] === "core:page-nav")
    expect(pageNav).toBeUndefined()
  })

  it("preserves global key positions on pages beyond the first (K=15, 16 buttons)", () => {
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 16 }, (_, i) => btn(i)),
      keyCount: 15,
    })
    expect(result).toHaveLength(2)
    const page2 = result[1]!.deck.buttons as Array<Record<string, unknown>>
    const userButtons = page2.filter((b) => b["type"] === "test:btn")
    // page-nav occupies K-2 (position 13), so surviving user buttons are at
    // positions 14 and 15.
    expect(userButtons.map((b) => b["position"])).toEqual([14, 15])
  })
})
