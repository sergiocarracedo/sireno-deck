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
      decks["calendar:events"]?.buttons.filter(
        (button) => button.type === "calendar:event",
      ),
    ).toHaveLength(2)
    expect(decks["calendar:events-p2"]).toBeDefined()
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
})
