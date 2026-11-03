import { describe, expect, it } from "vitest"
import { resolveAlarmOffsets, type AlarmSettings } from "../alarm-rules.js"
import { occurrenceKey, type CalendarEvent } from "../events.js"

const event: CalendarEvent = {
  identity: {
    providerInstanceId: "account",
    calendarId: "calendar",
    eventId: "event",
    occurrenceId: "occurrence",
  },
  title: "Example",
  time: {
    kind: "timed",
    start: "2026-11-03T10:00:00Z",
    end: "2026-11-03T11:00:00Z",
  },
  status: "confirmed",
}
const global: AlarmSettings = { enabled: true, offsetsMinutes: [-5, 0, 1] }

describe("calendar alarm rules", () => {
  it("uses defaults, overridden per calendar", () => {
    expect(resolveAlarmOffsets(event, global)).toEqual([-5, 0, 1])
    expect(
      resolveAlarmOffsets(event, global, {
        enabled: true,
        offsetsMinutes: [-10],
      }),
    ).toEqual([-10])
    expect(
      resolveAlarmOffsets(
        event,
        { enabled: false },
        { enabled: true, offsetsMinutes: [0] },
      ),
    ).toEqual([0])
  })

  it("prefers notification reminders and deduplicates offsets", () => {
    expect(
      resolveAlarmOffsets(
        { ...event, notificationReminders: [1, -5, -5] },
        global,
      ),
    ).toEqual([-5, 1])
    expect(
      resolveAlarmOffsets({ ...event, notificationReminders: [] }, global),
    ).toEqual([-5, 0, 1])
  })

  it("does not alarm disabled calendars or cancelled events", () => {
    expect(
      resolveAlarmOffsets({ ...event, notificationReminders: [-5] }, global, {
        enabled: false,
      }),
    ).toEqual([])
    expect(
      resolveAlarmOffsets({ ...event, status: "cancelled" }, global),
    ).toEqual([])
  })

  it("uses unambiguous provider and occurrence identities", () => {
    const a = { ...event.identity, providerInstanceId: "a:b", calendarId: "c" }
    const b = { ...event.identity, providerInstanceId: "a", calendarId: "b:c" }
    expect(occurrenceKey(a)).not.toBe(occurrenceKey(b))
    expect(occurrenceKey(a)).not.toBe(
      occurrenceKey({ ...a, occurrenceId: "other" }),
    )
  })
})
