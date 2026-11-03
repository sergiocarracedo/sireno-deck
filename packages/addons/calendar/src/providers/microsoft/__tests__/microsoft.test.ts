import { describe, expect, it, vi } from "vitest"
import { createMicrosoftCalendarProvider } from "../index.js"

const range = {
  timeMin: "2026-11-01T00:00:00Z",
  timeMax: "2026-12-01T00:00:00Z",
}
const json = (body: unknown) => new Response(JSON.stringify(body))

describe("Microsoft Calendar read adapter", () => {
  it("discovers calendars and reads only selected calendar views across pages", async () => {
    const fetcher = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input))
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer secret",
        )
        if (url.searchParams.has("$skip"))
          return json({ value: [{ id: "other", name: "Other" }] })
        if (url.pathname.endsWith("/calendars"))
          return json({
            value: [{ id: "work/a", name: "Work" }],
            "@odata.nextLink":
              "https://graph.microsoft.com/v1.0/me/calendars?$skip=1",
          })
        expect(url.pathname).toBe("/v1.0/me/calendars/work%2Fa/calendarView")
        expect(url.searchParams.get("startDateTime")).toBe(range.timeMin)
        expect(url.searchParams.get("endDateTime")).toBe(range.timeMax)
        return json({ value: [] })
      },
    )
    const provider = createMicrosoftCalendarProvider({
      instanceId: "account",
      calendarIds: ["work/a"],
      ...range,
      accessToken: "secret",
      fetch: fetcher,
    })
    expect(await provider.listCalendars()).toEqual([
      { id: "work/a", name: "Work" },
      { id: "other", name: "Other" },
    ])
    expect(await provider.fetchEvents()).toEqual([])
  })

  it("normalizes recurring exceptions, cancellations, reminders and all-day local dates across event pages", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input))
      if (url.searchParams.has("page"))
        return json({
          value: [
            {
              id: "cancel",
              seriesMasterId: "series",
              originalStart: "2026-11-05T10:00:00Z",
              isCancelled: true,
            },
            {
              id: "holiday",
              subject: "Holiday",
              isAllDay: true,
              originalStartTimeZone: "Europe/Madrid",
              start: {
                dateTime: "2026-11-06T23:00:00.0000000",
                timeZone: "UTC",
              },
              end: { dateTime: "2026-11-07T23:00:00.0000000", timeZone: "UTC" },
              isReminderOn: false,
            },
          ],
        })
      return json({
        value: [
          {
            id: "moved",
            seriesMasterId: "series",
            originalStart: "2026-11-04T10:00:00Z",
            subject: "Moved",
            start: { dateTime: "2026-11-04T12:00:00.0000000", timeZone: "UTC" },
            end: { dateTime: "2026-11-04T13:00:00.0000000", timeZone: "UTC" },
            isReminderOn: true,
            reminderMinutesBeforeStart: 15,
            location: { displayName: "Room" },
            webLink: "https://outlook.office.com/event",
          },
        ],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/me/calendars/work/calendarView?page=2",
      })
    })
    const provider = createMicrosoftCalendarProvider({
      instanceId: "account",
      calendarIds: ["work"],
      ...range,
      authorizedFetch: fetcher,
    })
    expect(await provider.readEvents()).toEqual({
      events: [
        {
          identity: {
            providerInstanceId: "account",
            calendarId: "work",
            eventId: "series",
            occurrenceId: "2026-11-04T10:00:00Z",
          },
          title: "Moved",
          time: {
            kind: "timed",
            start: "2026-11-04T12:00:00.0000000Z",
            end: "2026-11-04T13:00:00.0000000Z",
            timeZone: "UTC",
          },
          status: "confirmed",
          notificationReminders: [-15],
          location: "Room",
          externalUrl: "https://outlook.office.com/event",
        },
        {
          identity: {
            providerInstanceId: "account",
            calendarId: "work",
            eventId: "holiday",
            occurrenceId: "holiday",
          },
          title: "Holiday",
          time: {
            kind: "all-day",
            startDate: "2026-11-07",
            endDateExclusive: "2026-11-08",
            timeZone: "Europe/Madrid",
          },
          status: "confirmed",
          notificationReminders: [],
        },
      ],
      cancellations: [
        {
          providerInstanceId: "account",
          calendarId: "work",
          eventId: "series",
          occurrenceId: "2026-11-05T10:00:00Z",
        },
      ],
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it("supports Windows timezone mapping and rejects unmapped zones rather than changing dates", async () => {
    const authorizedFetch = async () =>
      json({
        value: [
          {
            id: "day",
            isAllDay: true,
            originalStartTimeZone: "Pacific Standard Time",
            start: { dateTime: "2026-11-07T08:00:00", timeZone: "UTC" },
            end: { dateTime: "2026-11-08T08:00:00", timeZone: "UTC" },
          },
        ],
      })
    const options = {
      instanceId: "a",
      calendarIds: ["work"],
      ...range,
      authorizedFetch,
    }
    await expect(
      createMicrosoftCalendarProvider(options).fetchEvents(),
    ).rejects.toThrow("unsupported timezone")
    const provider = createMicrosoftCalendarProvider({
      ...options,
      resolveTimeZone: () => "America/Los_Angeles",
    })
    expect((await provider.fetchEvents())[0]?.time).toEqual({
      kind: "all-day",
      startDate: "2026-11-07",
      endDateExclusive: "2026-11-08",
      timeZone: "America/Los_Angeles",
    })
  })

  it("sanitizes failures and does not send credentials to a pagination URL on another host", async () => {
    const options = { instanceId: "a", calendarIds: ["private"], ...range }
    const failing = createMicrosoftCalendarProvider({
      ...options,
      authorizedFetch: async () => {
        throw new Error("secret private")
      },
    })
    await expect(failing.fetchEvents()).rejects.toThrow(
      "Microsoft Calendar request failed",
    )
    const http = createMicrosoftCalendarProvider({
      ...options,
      authorizedFetch: async () => new Response("secret", { status: 401 }),
    })
    await expect(http.fetchEvents()).rejects.toThrow(
      "Microsoft Calendar request failed (401)",
    )
    const fetcher = vi.fn(async () =>
      json({
        value: [],
        "@odata.nextLink": "https://evil.example/?secret=token",
      }),
    )
    const provider = createMicrosoftCalendarProvider({
      ...options,
      accessToken: "secret",
      fetch: fetcher,
    })
    await expect(provider.fetchEvents()).rejects.toThrow(
      "Microsoft Calendar response was invalid",
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
    const empty = createMicrosoftCalendarProvider({
      ...options,
      calendarIds: [],
      authorizedFetch: fetcher,
    })
    expect(await empty.fetchEvents()).toEqual([])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("rejects malformed events without exposing their content", async () => {
    const provider = createMicrosoftCalendarProvider({
      instanceId: "a",
      calendarIds: ["work"],
      ...range,
      authorizedFetch: async () =>
        json({ value: [{ subject: "private meeting", isCancelled: true }] }),
    })
    await expect(provider.readEvents()).rejects.toThrow(
      "Microsoft Calendar response was invalid",
    )
  })
})
