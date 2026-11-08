/** Provider-specific identifiers are only unique within their parent scope. */
export interface EventIdentity {
  readonly providerInstanceId: string
  readonly calendarId: string
  readonly eventId: string
  readonly occurrenceId: string
}

export type EventTime =
  | {
      readonly kind: "timed"
      readonly start: string
      readonly end: string
      readonly timeZone?: string
    }
  | {
      readonly kind: "all-day"
      readonly startDate: string
      readonly endDateExclusive: string
      readonly timeZone: string
    }

export interface CalendarEvent {
  readonly identity: EventIdentity
  readonly title: string
  readonly calendarName?: string
  readonly calendarColor?: string
  readonly eventColor?: string
  readonly time: EventTime
  readonly status: "confirmed" | "cancelled"
  /** Notification-style offsets in minutes relative to event start. */
  readonly notificationReminders?: readonly number[]
  readonly location?: string
  readonly externalUrl?: string
}

/** JSON encoding avoids collisions even when provider identifiers contain separators. */
export const occurrenceKey = (id: EventIdentity): string =>
  JSON.stringify([
    id.providerInstanceId,
    id.calendarId,
    id.eventId,
    id.occurrenceId,
  ])
