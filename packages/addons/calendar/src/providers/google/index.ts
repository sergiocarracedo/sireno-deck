import type {
  CalendarEvent,
  EventIdentity,
  EventTime,
} from "../../domain/events.js"
import type { CalendarProvider } from "../../domain/provider-cache.js"

type Fetch = typeof globalThis.fetch
type Reminder = { method?: string; minutes?: number }
type DateValue = { date?: string; dateTime?: string; timeZone?: string }
type GoogleEvent = {
  id: string
  recurringEventId?: string
  originalStartTime?: DateValue
  status?: string
  summary?: string
  start?: DateValue
  end?: DateValue
  location?: string
  htmlLink?: string
  reminders?: { useDefault?: boolean; overrides?: Reminder[] }
}
type Page<T> = {
  items?: T[]
  nextPageToken?: string
  timeZone?: string
  defaultReminders?: Reminder[]
}
type GoogleCalendar = { id: string; summary?: string; timeZone?: string }

export interface GoogleCalendarOptions {
  readonly instanceId: string
  readonly calendarIds: readonly string[]
  readonly timeMin: string
  readonly timeMax: string
  readonly accessToken?: string
  readonly fetch?: Fetch
  readonly authorizedFetch?: Fetch
}

export interface CalendarSelection {
  readonly id: string
  readonly name: string
  readonly timeZone?: string
}

export interface GoogleCalendarProvider extends CalendarProvider {
  listCalendars(): Promise<readonly CalendarSelection[]>
  readEvents(): Promise<{
    events: readonly CalendarEvent[]
    cancellations: readonly EventIdentity[]
  }>
}

const base = "https://www.googleapis.com/calendar/v3/"

const identityFor = (
  instanceId: string,
  calendarId: string,
  event: GoogleEvent,
): EventIdentity => ({
  providerInstanceId: instanceId,
  calendarId,
  eventId: event.recurringEventId ?? event.id,
  occurrenceId: event.recurringEventId
    ? (event.originalStartTime?.dateTime ??
      event.originalStartTime?.date ??
      event.id)
    : event.id,
})

const eventTime = (
  event: GoogleEvent,
  calendarTimeZone?: string,
): EventTime => {
  const start = event.start
  const end = event.end
  if (start?.dateTime && end?.dateTime) {
    const timeZone = start.timeZone ?? calendarTimeZone
    return {
      kind: "timed",
      start: start.dateTime,
      end: end.dateTime,
      ...(timeZone ? { timeZone } : {}),
    }
  }
  if (start?.date && end?.date && calendarTimeZone) {
    return {
      kind: "all-day",
      startDate: start.date,
      endDateExclusive: end.date,
      timeZone: calendarTimeZone,
    }
  }
  throw new Error("Google Calendar returned an incomplete event")
}

const reminderOffsets = (
  reminders: Reminder[] | undefined,
): number[] | undefined =>
  reminders
    ?.filter(
      (reminder) =>
        reminder.method === "popup" && typeof reminder.minutes === "number",
    )
    .map((reminder) => -Number(reminder.minutes))

export const createGoogleCalendarProvider = (
  options: GoogleCalendarOptions,
): GoogleCalendarProvider => {
  const request = async <T>(url: URL): Promise<T> => {
    let response: Response
    try {
      if (options.authorizedFetch) response = await options.authorizedFetch(url)
      else {
        if (!options.accessToken) throw new Error()
        response = await (options.fetch ?? globalThis.fetch)(url, {
          headers: { Authorization: `Bearer ${options.accessToken}` },
        })
      }
    } catch {
      throw new Error("Google Calendar request failed")
    }
    if (!response.ok)
      throw new Error(`Google Calendar request failed (${response.status})`)
    try {
      return (await response.json()) as T
    } catch {
      throw new Error("Google Calendar response was invalid")
    }
  }

  const pages = async <T>(url: URL): Promise<Page<T>[]> => {
    const result: Page<T>[] = []
    let nextPageToken: string | undefined
    do {
      const page = await request<Page<T>>(url)
      if (
        !page ||
        typeof page !== "object" ||
        (page.items !== undefined && !Array.isArray(page.items)) ||
        (page.nextPageToken !== undefined &&
          typeof page.nextPageToken !== "string")
      ) {
        throw new Error("Google Calendar response was invalid")
      }
      result.push(page)
      nextPageToken = page.nextPageToken
      if (nextPageToken) url.searchParams.set("pageToken", nextPageToken)
    } while (nextPageToken)
    return result
  }

  const readEvents: GoogleCalendarProvider["readEvents"] = async () => {
    const events: CalendarEvent[] = []
    const cancellations: EventIdentity[] = []
    for (const calendarId of options.calendarIds) {
      const url = new URL(
        `calendars/${encodeURIComponent(calendarId)}/events`,
        base,
      )
      url.searchParams.set("singleEvents", "true")
      url.searchParams.set("showDeleted", "true")
      url.searchParams.set("timeMin", options.timeMin)
      url.searchParams.set("timeMax", options.timeMax)
      const result = await pages<GoogleEvent>(url)
      const timeZone = result.find((page) => page.timeZone)?.timeZone
      const defaults = result.find(
        (page) => page.defaultReminders !== undefined,
      )?.defaultReminders
      for (const page of result)
        for (const event of page.items ?? []) {
          const identity = identityFor(options.instanceId, calendarId, event)
          if (event.status === "cancelled") {
            cancellations.push(identity)
            continue
          }
          const reminders =
            event.reminders?.useDefault === true
              ? reminderOffsets(defaults)
              : event.reminders?.useDefault === false
                ? reminderOffsets(event.reminders.overrides ?? [])
                : undefined
          events.push({
            identity,
            title: event.summary ?? "",
            time: eventTime(event, timeZone),
            status: "confirmed",
            ...(reminders === undefined
              ? {}
              : { notificationReminders: reminders }),
            ...(event.location === undefined
              ? {}
              : { location: event.location }),
            ...(event.htmlLink === undefined
              ? {}
              : { externalUrl: event.htmlLink }),
          })
        }
    }
    return { events, cancellations }
  }

  return {
    instanceId: options.instanceId,
    async listCalendars() {
      const result = await pages<GoogleCalendar>(
        new URL("users/me/calendarList", base),
      )
      return result.flatMap((page) =>
        (page.items ?? []).map((calendar) => ({
          id: calendar.id,
          name: calendar.summary ?? calendar.id,
          ...(calendar.timeZone ? { timeZone: calendar.timeZone } : {}),
        })),
      )
    },
    readEvents,
    async fetchEvents() {
      return (await readEvents()).events
    },
  }
}
