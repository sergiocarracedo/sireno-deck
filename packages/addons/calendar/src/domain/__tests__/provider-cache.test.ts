import { describe, expect, it } from "vitest"
import { refreshProviders, type ProviderSnapshot } from "../provider-cache.js"
import type { CalendarEvent } from "../events.js"

const event: CalendarEvent = {
  identity: {
    providerInstanceId: "first",
    calendarId: "calendar",
    eventId: "event",
    occurrenceId: "one",
  },
  title: "Meeting",
  time: {
    kind: "timed",
    start: "2026-11-03T10:00:00Z",
    end: "2026-11-03T11:00:00Z",
  },
  status: "confirmed",
}

describe("provider refresh", () => {
  it("retains stale data for a failed instance while updating others", async () => {
    const previous: ProviderSnapshot[] = [
      { instanceId: "first", events: [event], status: "ok" },
    ]
    const result = await refreshProviders(previous, [
      {
        instanceId: "first",
        fetchEvents: async () => {
          throw new Error("secret URL")
        },
      },
      { instanceId: "second", fetchEvents: async () => [] },
    ])
    expect(result).toEqual([
      { instanceId: "first", events: [event], status: "stale" },
      { instanceId: "second", events: [], status: "ok" },
    ])
    expect(JSON.stringify(result)).not.toContain("secret URL")
  })

  it("distinguishes a first-time failure from an empty successful calendar", async () => {
    const result = await refreshProviders(
      [],
      [
        {
          instanceId: "failed",
          fetchEvents: async () => {
            throw new Error("failure")
          },
        },
        { instanceId: "empty", fetchEvents: async () => [] },
      ],
    )
    expect(result).toEqual([
      { instanceId: "failed", events: [], status: "unavailable" },
      { instanceId: "empty", events: [], status: "ok" },
    ])
  })
})
