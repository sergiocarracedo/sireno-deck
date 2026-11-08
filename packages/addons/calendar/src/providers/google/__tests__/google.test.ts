import { describe, expect, it, vi } from "vitest"
import { createGoogleCalendarProvider } from "../index.js"
import { refreshProviders } from "../../../domain/provider-cache.js"

const range = {
  timeMin: "2026-11-01T00:00:00Z",
  timeMax: "2026-12-01T00:00:00Z",
}
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 })

describe("Google Calendar read adapter", () => {
  it("adds calendar names and colors, with event colors taking precedence", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const path = new URL(String(input)).pathname
      if (path.endsWith("/calendarList"))
        return json({
          items: [{ id: "c", summary: "Feverup", backgroundColor: "#9955cc" }],
        })
      if (path.endsWith("/colors"))
        return json({ event: { "5": { background: "#ffff00" } } })
      return json({
        items: [
          {
            id: "a",
            start: { dateTime: "2026-11-04T10:00:00Z" },
            end: { dateTime: "2026-11-04T11:00:00Z" },
          },
          {
            id: "b",
            summary: "Cita luz",
            colorId: "5",
            start: { dateTime: "2026-11-04T12:00:00Z" },
            end: { dateTime: "2026-11-04T13:00:00Z" },
          },
        ],
      })
    })
    const provider = createGoogleCalendarProvider({
      instanceId: "a",
      calendarIds: ["c"],
      ...range,
      authorizedFetch: fetcher,
    })
    const events = await provider.fetchEvents()
    expect(events[0]).toMatchObject({
      calendarName: "Feverup",
      calendarColor: "#9955cc",
      title: "",
    })
    expect(events[1]).toMatchObject({
      calendarName: "Feverup",
      calendarColor: "#9955cc",
      eventColor: "#ffff00",
    })
  })
  it("discovers pages and fetches only selected calendars with stable recurring identities and reminders", async () => {
    const fetcher = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input))
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer secret",
        )
        if (url.pathname.endsWith("/users/me/calendarList")) {
          return json(
            url.searchParams.has("pageToken")
              ? { items: [{ id: "other", summary: "Other" }] }
              : {
                  items: [
                    {
                      id: "work/a",
                      summary: "Work",
                      backgroundColor: "#aabbcc",
                      timeZone: "Europe/Madrid",
                    },
                  ],
                  nextPageToken: "next",
                },
          )
        }
        expect(url.pathname).toContain("work%2Fa/events")
        expect(url.searchParams.get("singleEvents")).toBe("true")
        expect(url.searchParams.get("showDeleted")).toBe("true")
        expect(url.searchParams.get("timeMin")).toBe(range.timeMin)
        expect(url.searchParams.get("timeMax")).toBe(range.timeMax)
        return json(
          url.searchParams.has("pageToken")
            ? {
                items: [
                  {
                    id: "cancelled",
                    status: "cancelled",
                    recurringEventId: "series",
                    originalStartTime: { dateTime: "2026-11-05T10:00:00Z" },
                  },
                  {
                    id: "day",
                    summary: "Holiday",
                    start: { date: "2026-11-07" },
                    end: { date: "2026-11-08" },
                    reminders: { useDefault: false },
                  },
                ],
              }
            : {
                timeZone: "Europe/Madrid",
                defaultReminders: [
                  { method: "popup", minutes: 10 },
                  { method: "email", minutes: 20 },
                ],
                nextPageToken: "two",
                items: [
                  {
                    id: "instance",
                    recurringEventId: "series",
                    originalStartTime: { dateTime: "2026-11-04T10:00:00Z" },
                    summary: "Moved",
                    start: { dateTime: "2026-11-04T12:00:00Z" },
                    end: { dateTime: "2026-11-04T13:00:00Z" },
                    reminders: { useDefault: true },
                    htmlLink: "https://calendar.google.com/event",
                  },
                ],
              },
        )
      },
    )
    const provider = createGoogleCalendarProvider({
      instanceId: "account",
      calendarIds: ["work/a"],
      ...range,
      accessToken: "secret",
      fetch: fetcher,
    })
    expect(await provider.listCalendars()).toEqual([
      {
        id: "work/a",
        name: "Work",
        timeZone: "Europe/Madrid",
        color: "#aabbcc",
      },
      { id: "other", name: "Other" },
    ])
    const result = await provider.readEvents()
    expect(result.events).toEqual([
      {
        identity: {
          providerInstanceId: "account",
          calendarId: "work/a",
          eventId: "series",
          occurrenceId: "2026-11-04T10:00:00Z",
        },
        title: "Moved",
        time: {
          kind: "timed",
          start: "2026-11-04T12:00:00Z",
          end: "2026-11-04T13:00:00Z",
          timeZone: "Europe/Madrid",
        },
        status: "confirmed",
        notificationReminders: [-10],
        externalUrl: "https://calendar.google.com/event",
      },
      {
        identity: {
          providerInstanceId: "account",
          calendarId: "work/a",
          eventId: "day",
          occurrenceId: "day",
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
    ])
    expect(result.cancellations).toEqual([
      {
        providerInstanceId: "account",
        calendarId: "work/a",
        eventId: "series",
        occurrenceId: "2026-11-05T10:00:00Z",
      },
    ])
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it("supports authorized fetch, overrides, unavailable defaults and empty selection", async () => {
    const fetcher = vi.fn(async () =>
      json({
        timeZone: "UTC",
        items: [
          {
            id: "a",
            start: { dateTime: "2026-11-04T10:00:00Z" },
            end: { dateTime: "2026-11-04T11:00:00Z" },
            reminders: {
              useDefault: false,
              overrides: [
                { method: "popup", minutes: 5 },
                { method: "email", minutes: 15 },
              ],
            },
          },
          {
            id: "b",
            start: { dateTime: "2026-11-04T10:00:00Z" },
            end: { dateTime: "2026-11-04T11:00:00Z" },
            reminders: { useDefault: true },
          },
        ],
      }),
    )
    const provider = createGoogleCalendarProvider({
      instanceId: "a",
      calendarIds: ["selected"],
      ...range,
      authorizedFetch: fetcher,
    })
    const events = await provider.fetchEvents()
    expect(events[0]?.notificationReminders).toEqual([-5])
    expect(events[1]?.notificationReminders).toBeUndefined()
    const empty = createGoogleCalendarProvider({
      instanceId: "a",
      calendarIds: [],
      ...range,
      authorizedFetch: fetcher,
    })
    expect(await empty.fetchEvents()).toEqual([])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it("sanitizes HTTP and transport errors and preserves stale snapshots", async () => {
    const provider = createGoogleCalendarProvider({
      instanceId: "a",
      calendarIds: ["private"],
      ...range,
      authorizedFetch: async () => {
        throw new Error("secret token private")
      },
    })
    await expect(provider.fetchEvents()).rejects.toThrow(
      "Google Calendar request failed",
    )
    try {
      await provider.fetchEvents()
    } catch (error) {
      expect(String(error)).not.toContain("secret")
    }
    expect(
      await refreshProviders(
        [{ instanceId: "a", events: [], status: "ok" }],
        [provider],
      ),
    ).toEqual([{ instanceId: "a", events: [], status: "stale" }])
    const http = createGoogleCalendarProvider({
      instanceId: "a",
      calendarIds: ["private"],
      ...range,
      authorizedFetch: async () =>
        new Response("secret token", { status: 401 }),
    })
    await expect(http.fetchEvents()).rejects.toThrow(
      "Google Calendar request failed (401)",
    )
  })

  it("fails a malformed response instead of presenting it as an empty calendar", async () => {
    const provider = createGoogleCalendarProvider({
      instanceId: "a",
      calendarIds: ["selected"],
      ...range,
      authorizedFetch: async () => json({ items: "invalid" }),
    })
    await expect(provider.fetchEvents()).rejects.toThrow(
      "Google Calendar response was invalid",
    )
  })
})
