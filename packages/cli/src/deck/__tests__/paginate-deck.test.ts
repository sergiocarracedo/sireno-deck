/** @vitest-environment node */
import { describe, expect, it } from "vitest"

import { paginateDeck } from "../paginate-deck"

// ponytail: input positions are ordering hints. After positionButtons
// they're renumbered 0..N-1. paginate() then groups by floor(pos/(K-2))
// and slot = pos % (K-2). paginateDeck emits each page with LOCAL slot
// positions 0..K-1 — the frontend renders a fixed K-key grid per page,
// so n-1 (sysBack) and n-2 (pageNav) stay reserved on every page
// independently.
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

  it("resets user positions to local slot indices on every page (K=15, 16 buttons)", () => {
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 16 }, (_, i) => btn(i)),
      keyCount: 15,
    })
    expect(result).toHaveLength(2)
    const page2 = result[1]!.deck.buttons as Array<Record<string, unknown>>
    const userButtons = page2.filter((b) => b["type"] === "test:btn")
    // 16 buttons with positions 0..15 → pageSize=13 splits them at 0..12
    // (page 0) and 13..15 (page 1). paginateDeck emits page 1's three
    // user buttons at LOCAL slots 0, 1, 2. n-2 (pageNav) is added at 13,
    // n-1 (sysBack) at 14.
    expect(userButtons.map((b) => b["position"])).toEqual([0, 1, 2])
  })
})
