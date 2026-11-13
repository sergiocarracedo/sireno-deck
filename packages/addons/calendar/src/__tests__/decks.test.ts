import { describe, expect, it } from "vitest"
import { createCalendarDecks, safeEventUrl } from "../decks.js"

describe("calendar decks", () => {
  it("paginates calendar settings and leaves the back slot free", () => {
    const calendars = Array.from({ length: 7 }, (_, i) => ({
      instanceId: "work",
      id: `c${i}`,
      name: `Calendar ${i}`,
      enabled: i === 0,
    }))
    const decks = createCalendarDecks([], 6, calendars)
    expect(
      decks["calendar:settings"]?.buttons.filter(
        (button) => button.type === "calendar:setting",
      ),
    ).toHaveLength(4)
    expect(
      decks["calendar:settings-p2"]?.buttons.filter(
        (button) => button.type === "calendar:setting",
      ),
    ).toHaveLength(3)
    expect(
      decks["calendar:settings"]?.buttons.find(
        (button) => button.type === "core:page-nav",
      )?.position,
    ).toBe(4)
    expect(
      decks["calendar:settings"]?.buttons.some(
        (button) => button.position === 5,
      ),
    ).toBe(false)
  })
  it("does not add local settings buttons to calendar listing pages", () => {
    const decks = createCalendarDecks(
      Array.from({ length: 20 }, (_, i) => ({
        day: `2026-11-${String(i + 1).padStart(2, "0")}`,
      })),
      15,
    )
    const pages = Object.entries(decks).filter(
      ([id]) =>
        id === "calendar:deck" ||
        id.startsWith("calendar:deck-p") ||
        id === "calendar:days" ||
        id.startsWith("calendar:days-p") ||
        id.startsWith("calendar:day-"),
    )
    expect(pages.length).toBeGreaterThan(3)
    for (const [, deck] of pages) {
      expect(
        deck.buttons.some(
          (button) => button.config.deck === "calendar:settings",
        ),
      ).toBe(false)
      expect(new Set(deck.buttons.map((button) => button.position)).size).toBe(
        deck.buttons.length,
      )
    }
    expect(decks["calendar:settings"]).toBeDefined()
  })
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
      decks["calendar:days"]?.buttons.some(
        (button) => button.config.deck === "calendar:deck",
      ),
    ).toBe(false)
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
