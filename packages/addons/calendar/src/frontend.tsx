import type { CalendarSnapshot } from "./runtime.js"

declare global {
  var __calendarUseAddonChannel:
    | (<T>(channel: string) => { data: T | undefined })
    | undefined
}

export const CalendarButton = () => {
  const data =
    globalThis.__calendarUseAddonChannel?.<CalendarSnapshot>(
      "calendar:state",
    ).data
  if (!data)
    return (
      <div>
        Calendar
        <br />
        Loading…
      </div>
    )
  const problem = data.providers.find((provider) => provider.status !== "ok")
  const event = data.page > 0 ? data.events[data.page - 1] : undefined
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <strong>{data.alarm?.title || event?.title || "Calendar"}</strong>
      <span>
        {data.alarm
          ? "Tap to snooze · Hold to dismiss"
          : event
            ? event.time.kind === "timed"
              ? new Date(event.time.start).toLocaleString()
              : event.time.startDate
            : `${data.events.length} upcoming`}
      </span>
      {problem && (
        <span>
          {problem.name}: {problem.status}
        </span>
      )}
      {data.error && <span>{data.error}</span>}
    </div>
  )
}

const EventContents = ({
  event,
  details = false,
}: {
  event: CalendarSnapshot["events"][number] | undefined
  details?: boolean
}) =>
  event ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        textAlign: "center",
        overflow: "hidden",
        overflowWrap: "anywhere",
      }}
    >
      <strong>{event.title || "Untitled event"}</strong>
      <span>
        {event.time.kind === "timed"
          ? new Date(event.time.start).toLocaleString()
          : `${event.time.startDate} · All day`}
      </span>
      {details && (
        <>
          <span>{event.calendar}</span>
          {event.location && <span>{event.location}</span>}
          <span>{event.hasLink ? "Hold to open" : "No event link"}</span>
        </>
      )}
    </div>
  ) : (
    <div>Event unavailable</div>
  )

export const CalendarEventButton = ({
  config,
}: {
  config: { slot: number }
}) => {
  const data =
    globalThis.__calendarUseAddonChannel?.<CalendarSnapshot>(
      "calendar:state",
    ).data
  return <EventContents event={data?.events[config.slot]} />
}

export const CalendarDetailButton = () => {
  const data =
    globalThis.__calendarUseAddonChannel?.<CalendarSnapshot>(
      "calendar:state",
    ).data
  return <EventContents event={data?.detail} details />
}

export const CalendarNavigationButton = ({
  config,
}: {
  config: { label?: string; day?: string }
}) => <div>{config.label ?? config.day}</div>
