import type { CalendarSnapshot } from "./runtime.js"

type Event = CalendarSnapshot["events"][number]

export const localDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const eventDate = (event: Event): Date =>
  event.time.kind === "timed"
    ? new Date(event.time.start)
    : new Date(`${event.time.startDate}T00:00:00`)

export const eventTimeLabel = (event: Event): string =>
  event.time.kind === "timed"
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(eventDate(event))
    : "ALL DAY"

export const agendaEventTimeLabel = (event: Event, now: Date): string => {
  const date = eventDate(event)
  const time = eventTimeLabel(event)
  if (event.day === localDay(now)) return time
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")} ${time}`
}

export const agendaDateLabel = (event: Event, now: Date): string => {
  if (event.day === localDay(now)) return "TODAY"
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (event.day === localDay(tomorrow))
    return new Intl.DateTimeFormat("en", { weekday: "short" })
      .format(eventDate(event))
      .toUpperCase()
  const date = eventDate(event)
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`
}

export const eventHeading = (event: Event, now: Date): string => {
  const date = eventDate(event)
  if (event.day === localDay(now)) return `TODAY ${eventTimeLabel(event)}`
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() + 2)
  const day = String(date.getDate()).padStart(2, "0")
  const prefix =
    date > cutoff
      ? `${day} ${new Intl.DateTimeFormat(undefined, { month: "short" }).format(date).toUpperCase()}`
      : `${new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date).toUpperCase()} ${day}`
  return `${prefix} ${eventTimeLabel(event)}`
}

export const agendaSummary = (events: readonly Event[], now: Date) => ({
  next: events.find((event) =>
    event.time.kind === "all-day"
      ? event.day >= localDay(now)
      : eventDate(event).getTime() >= now.getTime(),
  ),
  today: events.filter((event) => event.day === localDay(now)).length,
})
