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

  it("page-nav and last emoji do not collide on page 1 of 14 items (keyCount=15)", () => {
    const result = paginateDeck({
      baseDeckId: "deck",
      buttons: Array.from({ length: 14 }, (_, i) => ({
        type: "test:btn",
        label: `b${i}`,
      })),
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
      buttons: Array.from({ length: 14 }, (_, i) => ({
        type: "test:btn",
        label: `b${i}`,
      })),
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
      buttons: Array.from({ length: 13 }, (_, i) => ({
        type: "test:btn",
        label: `b${i}`,
      })),
      keyCount: 15,
    })
    expect(result).toHaveLength(1)
    const pageNav = (
      result[0]!.deck.buttons as Array<Record<string, unknown>>
    ).find((b) => b["type"] === "core:page-nav")
    expect(pageNav).toBeUndefined()
  })
})
