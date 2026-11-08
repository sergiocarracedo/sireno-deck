import type {
  CalendarEvent,
  EventIdentity,
  EventTime,
} from "../../domain/events.js"
import type { CalendarProvider } from "../../domain/provider-cache.js"

type Fetch = typeof globalThis.fetch
type Page<T> = { value: T[]; "@odata.nextLink"?: string }
type GraphCalendar = { id: string; name?: string }
type GraphTime = { dateTime: string; timeZone: string }
type GraphEvent = {
  id: string
  seriesMasterId?: string | null
  originalStart?: string | null
  isCancelled?: boolean
  subject?: string
  start?: GraphTime
  end?: GraphTime
  isAllDay?: boolean
  originalStartTimeZone?: string
  isReminderOn?: boolean
  reminderMinutesBeforeStart?: number
  location?: { displayName?: string }
  webLink?: string
}

export interface MicrosoftCalendarOptions {
  readonly instanceId: string
  readonly calendarIds: readonly string[]
  readonly timeMin: string
  readonly timeMax: string
  readonly accessToken?: string
  readonly fetch?: Fetch
  readonly authorizedFetch?: Fetch
  /** Translate Graph's Windows timezone names to IANA names for all-day events. */
  readonly resolveTimeZone?: (timeZone: string) => string
}

export interface MicrosoftCalendarProvider extends CalendarProvider {
  listCalendars(): Promise<readonly { id: string; name: string }[]>
  readEvents(): Promise<{
    events: readonly CalendarEvent[]
    cancellations: readonly EventIdentity[]
  }>
}

const base = "https://graph.microsoft.com/v1.0/"

const utcTime = (value: string): string =>
  /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`

const localDate = (value: GraphTime, timeZone: string): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(utcTime(value.dateTime)))
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value
    return `${part("year")}-${part("month")}-${part("day")}`
  } catch {
    throw new Error("Microsoft Calendar returned an unsupported timezone")
  }
}

export const createMicrosoftCalendarProvider = (
  options: MicrosoftCalendarOptions,
): MicrosoftCalendarProvider => {
  const pages = async <T>(initial: URL): Promise<T[]> => {
    const values: T[] = []
    let url: URL | undefined = initial
    const visited = new Set<string>()
    while (url) {
      if (url.origin !== "https://graph.microsoft.com" || visited.has(url.href))
        throw new Error("Microsoft Calendar response was invalid")
      visited.add(url.href)
      let response: Response
      try {
        const headers = new Headers({ Prefer: 'IdType="ImmutableId"' })
        if (options.authorizedFetch)
          response = await options.authorizedFetch(url, { headers })
        else {
          if (!options.accessToken) throw new Error()
          headers.set("Authorization", `Bearer ${options.accessToken}`)
          response = await (options.fetch ?? globalThis.fetch)(url, { headers })
        }
      } catch {
        throw new Error("Microsoft Calendar request failed")
      }
      if (!response.ok)
        throw new Error(
          `Microsoft Calendar request failed (${response.status})`,
        )
      let page: Page<T>
      try {
        page = (await response.json()) as Page<T>
        if (
          !page ||
          !Array.isArray(page.value) ||
          (page["@odata.nextLink"] !== undefined &&
            typeof page["@odata.nextLink"] !== "string")
        )
          throw new Error()
        values.push(...page.value)
        url = page["@odata.nextLink"]
          ? new URL(page["@odata.nextLink"])
          : undefined
      } catch {
        throw new Error("Microsoft Calendar response was invalid")
      }
    }
    return values
  }
  const readEvents: MicrosoftCalendarProvider["readEvents"] = async () => {
    const events: CalendarEvent[] = []
    const cancellations: EventIdentity[] = []
    for (const calendarId of options.calendarIds) {
      const url = new URL(
        `me/calendars/${encodeURIComponent(calendarId)}/calendarView`,
        base,
      )
      url.searchParams.set("startDateTime", options.timeMin)
      url.searchParams.set("endDateTime", options.timeMax)
      for (const event of await pages<GraphEvent>(url)) {
        if (!event || typeof event.id !== "string" || !event.id)
          throw new Error("Microsoft Calendar response was invalid")
        const identity: EventIdentity = {
          providerInstanceId: options.instanceId,
          calendarId,
          eventId: event.seriesMasterId ?? event.id,
          occurrenceId: event.seriesMasterId
            ? (event.originalStart ?? event.id)
            : event.id,
        }
        if (event.isCancelled) {
          cancellations.push(identity)
          continue
        }
        if (!event.start?.dateTime || !event.end?.dateTime)
          throw new Error("Microsoft Calendar returned an incomplete event")
        const zone = event.originalStartTimeZone ?? event.start.timeZone
        let timeZone: string
        try {
          timeZone = options.resolveTimeZone?.(zone) ?? zone
        } catch {
          throw new Error("Microsoft Calendar returned an unsupported timezone")
        }
        const time: EventTime = event.isAllDay
          ? {
              kind: "all-day",
              startDate: localDate(event.start, timeZone),
              endDateExclusive: localDate(event.end, timeZone),
              timeZone,
            }
          : {
              kind: "timed",
              start: utcTime(event.start.dateTime),
              end: utcTime(event.end.dateTime),
              timeZone: event.start.timeZone,
            }
        events.push({
          identity,
          title: event.subject ?? "",
          time,
          status: "confirmed",
          ...(event.isReminderOn === false
            ? { notificationReminders: [] }
            : event.isReminderOn &&
                typeof event.reminderMinutesBeforeStart === "number"
              ? { notificationReminders: [-event.reminderMinutesBeforeStart] }
              : {}),
          ...(event.location?.displayName
            ? { location: event.location.displayName }
            : {}),
          ...(event.webLink ? { externalUrl: event.webLink } : {}),
        })
      }
    }
    return { events, cancellations }
  }
  return {
    instanceId: options.instanceId,
    listCalendars: async () =>
      (await pages<GraphCalendar>(new URL("me/calendars", base))).map(
        (calendar) => ({ id: calendar.id, name: calendar.name ?? calendar.id }),
      ),
    readEvents,
    fetchEvents: async () => (await readEvents()).events,
  }
}
