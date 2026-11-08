import { describe, expect, it } from "vitest"
import { calendarConfigSchema } from "../config.js"

describe("calendar service configuration", () => {
  it("defaults timing and supports multiple provider instances", () => {
    const result = calendarConfigSchema.parse({
      providers: [
        {
          id: "personal",
          type: "google",
          clientId: "client",
          calendarIds: ["primary"],
          calendarAlarms: { primary: { enabled: false } },
        },
        {
          id: "work",
          type: "google",
          clientId: "other",
          calendarIds: ["team"],
        },
        {
          id: "outlook",
          type: "microsoft",
          clientId: "ms",
          calendarIds: ["work"],
        },
        { id: "feed", type: "ical", url: "https://example.com/calendar.ics" },
      ],
    })
    expect(result.snoozeMinutes).toBe(5)
    expect(result.alarms).toEqual({ enabled: true, offsetsMinutes: [-5, 0] })
    expect(result.useCalendarReminders).toBe(false)
    expect(result.repeatMinutes).toBe(1)
    expect(result.missedGraceMinutes).toBe(60)
    expect(result.allDayTime).toBe("09:00")
    expect(result.lookaheadDays).toBe(7)
    expect(result.interrupt).toBe(true)
    expect(result.providers).toHaveLength(4)
  })

  it("accepts calendar alarm overrides and a secret feed reference", () => {
    const parsed = calendarConfigSchema.parse({
      providers: [
        {
          id: "feed",
          type: "ical",
          credentialName: "private-feed",
          alarms: { enabled: false },
        },
      ],
    })
    expect(parsed.providers[0]?.alarms).toEqual({ enabled: false })
  })

  it("rejects unknown keys, invalid times and duplicated provider IDs", () => {
    expect(calendarConfigSchema.safeParse({ unknown: true }).success).toBe(
      false,
    )
    expect(
      calendarConfigSchema.safeParse({ allDayTime: "25:00" }).success,
    ).toBe(false)
    expect(calendarConfigSchema.safeParse({ snoozeMinutes: 0 }).success).toBe(
      false,
    )
    expect(
      calendarConfigSchema.safeParse({
        providers: [
          { id: "same", type: "ical", url: "https://example.com/a" },
          { id: "same", type: "ical", url: "https://example.com/b" },
        ],
      }).success,
    ).toBe(false)
  })
})
