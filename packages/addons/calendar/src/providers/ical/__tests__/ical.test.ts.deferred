import { describe, expect, it } from "vitest"
import { createICalendarProvider } from "../index.js"

describe("iCalendar feed adapter", () => {
  it("normalizes an all-day event with an exclusive end", async () => {
    const provider = createICalendarProvider({
      instanceId: "feed",
      calendarId: "personal",
      url: "https://example.com/secret",
      timeZone: "UTC",
      timeMin: "2026-11-01T00:00:00Z",
      timeMax: "2026-12-01T00:00:00Z",
      fetch: async () => new Response("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:holiday\r\nDTSTART;VALUE=DATE:20261107\r\nDTEND;VALUE=DATE:20261109\r\nSUMMARY:Holiday\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"),
    })
    expect(await provider.fetchEvents()).toEqual([{
      identity: { providerInstanceId: "feed", calendarId: "personal", eventId: "holiday", occurrenceId: "holiday" },
      title: "Holiday",
      time: { kind: "all-day", startDate: "2026-11-07", endDateExclusive: "2026-11-09", timeZone: "UTC" },
      status: "confirmed",
      notificationReminders: [],
    }])
  })
})
