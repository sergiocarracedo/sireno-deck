import { describe, expect, it } from "vitest"
import { createCalendarDecks, safeEventUrl } from "../decks.js"

describe("calendar decks", () => {
  it("paginates chronological events and groups them by day", () => {
    const events = [
      "2026-11-05",
      "2026-11-05",
      "2026-11-06",
      "2026-11-06",
      "2026-11-07",
    ].map((day) => ({ day }))
    const decks = createCalendarDecks(events, 5)
    expect(
      decks["calendar:deck"]?.buttons.filter(
        (button) => button.type === "calendar:event",
      ),
    ).toHaveLength(2)
    expect(decks["calendar:deck-p2"]).toBeDefined()
    expect(
      decks["calendar:deck"]?.buttons.find((button) => button.position === 0),
    ).toMatchObject({
      type: "core:change-deck",
      config: { deck: "calendar:days" },
    })
    expect(
      decks["calendar:deck"]?.buttons.find(
        (button) => button.type === "core:page-nav",
      ),
    ).toMatchObject({
      position: 3,
      config: {
        currentPage: 1,
        totalPages: 3,
        nextDeckId: "calendar:deck-p2",
      },
    })
    expect(
      decks["calendar:days"]?.buttons.filter(
        (button) => button.type === "calendar:day",
      ),
    ).toHaveLength(2)
    expect(decks["calendar:days-p2"]).toBeDefined()
    expect(
      decks["calendar:day-2026-11-05"]?.buttons.filter(
        (button) => button.type === "calendar:event",
      ),
    ).toHaveLength(2)
  })

  it("accepts only absolute HTTP(S) links", () => {
    expect(safeEventUrl("https://example.com/a?x=%3Btouch%20file")).toBe(
      "https://example.com/a?x=%3Btouch%20file",
    )
    expect(safeEventUrl("javascript:alert(1)")).toBeUndefined()
    expect(safeEventUrl("file:///tmp/a")).toBeUndefined()
    expect(safeEventUrl("/relative")).toBeUndefined()
  })

  it("places alarm controls around the centre and preserves the back slot", () => {
    const buttons = createCalendarDecks([], 15)["calendar:alarm"]!.buttons
    expect(buttons.map(({ type, position }) => [type, position])).toEqual([
      ["calendar:alarm-dismiss", 6],
      ["calendar:alarm-bell", 7],
      ["calendar:alarm-snooze", 8],
      ["calendar:alarm-title", 1],
      ["calendar:alarm-title", 2],
      ["calendar:alarm-title", 3],
      ["calendar:alarm-countdown", 11],
      ["calendar:alarm-clock", 13],
      ["calendar:alarm-arrow", 12],
    ])
    expect(buttons.some(({ position }) => position === 14)).toBe(false)
  })
  it("keeps alarm actions and title accessible on a six-key deck", () => {
    const buttons = createCalendarDecks([], 6)["calendar:alarm"]!.buttons
    expect(buttons.map(({ type, position }) => [type, position])).toEqual([
      ["calendar:alarm-dismiss", 0],
      ["calendar:alarm-bell", 1],
      ["calendar:alarm-snooze", 2],
      ["calendar:alarm-title", 4],
      ["calendar:alarm-compact-info", 3],
    ])
  })
})
