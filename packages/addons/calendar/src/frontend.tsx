import { useEffect, useState, type CSSProperties } from "react"
import { IconLabelSurface } from "@sirenodeck/sirenodeck/ui/surfaces/IconLabelSurface"
import type { CalendarSnapshot } from "./runtime.js"
import {
  agendaDateLabel,
  agendaSummary,
  eventTimeLabel,
} from "./presentation.js"

declare global {
  var __calendarUseAddonChannel:
    | (<T>(channel: string) => { data: T | undefined })
    | undefined
}

const accent = "var(--sireno-color-primary, #62d5d0)"
const foreground = "var(--sireno-color-foreground, #fff)"
const contrast = "var(--sireno-color-foreground-contrast, #111)"
const lines: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
  overflowWrap: "anywhere",
}
const centered: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  minWidth: 0,
  overflow: "hidden",
  textAlign: "center",
  gap: "3%",
  lineHeight: 1.1,
}

const CalendarIcon = ({
  bell = false,
  clock = false,
}: {
  bell?: boolean
  clock?: boolean
}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {bell ? (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ) : clock ? (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ) : (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    )}
  </svg>
)

export const CalendarButton = () => {
  const data =
    globalThis.__calendarUseAddonChannel?.<CalendarSnapshot>(
      "calendar:state",
    ).data
  if (!data)
    return (
      <div style={centered}>
        Agenda
        <br />
        Loading…
      </div>
    )
  const problem = data.providers.find(
    (provider) => provider.status === "unavailable",
  )
  const now = new Date()
  const { next, today } = agendaSummary(data.events, now)
  return (
    <div style={{ ...centered, color: foreground }}>
      {!next && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.3em",
            whiteSpace: "nowrap",
            fontSize: "0.75em",
            fontWeight: "normal",
          }}
        >
          <span style={{ color: accent }}>
            <CalendarIcon />
          </span>{" "}
          AGENDA
        </span>
      )}
      {next ? (
        <>
          <span
            style={{
              color: next.color ?? accent,
              border: `1px solid ${next.color ?? accent}`,
              background: `color-mix(in srgb, ${next.color ?? accent} 20%, transparent)`,
              borderRadius: "999px",
              padding: "0 0.45em",
              fontSize: "0.7em",
              whiteSpace: "nowrap",
            }}
          >
            {agendaDateLabel(next, now)}
          </span>
          <strong
            style={{
              color: next.color ?? accent,
              fontSize: "1.15em",
              lineHeight: 1,
            }}
          >
            {eventTimeLabel(next)}
          </strong>
          <span
            style={{
              maxWidth: "95%",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {next.title || "Untitled event"}
          </span>
        </>
      ) : (
        <span>No upcoming events</span>
      )}
      <span style={{ fontSize: "0.75em", fontWeight: "normal" }}>
        <b style={{ color: accent }}>{today}</b> TODAY
      </span>
      {problem && (
        <small>
          {problem.name}: {problem.status}
        </small>
      )}
      {data.error && <small>{data.error}</small>}
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
    <div style={{ ...centered, color: foreground }}>
      <span
        style={{
          color: event.color ?? accent,
          border: `1px solid ${event.color ?? accent}`,
          background: `color-mix(in srgb, ${event.color ?? accent} 20%, transparent)`,
          borderRadius: "999px",
          padding: "0 0.45em",
          fontSize: "0.7em",
          whiteSpace: "nowrap",
        }}
      >
        {agendaDateLabel(event, new Date())}
      </span>
      <strong
        style={{
          color: event.color ?? accent,
          fontSize: "0.7em",
          lineHeight: 1,
        }}
      >
        {eventTimeLabel(event)}
      </strong>
      <strong style={{ ...lines, maxWidth: "95%" }}>
        {event.title || "Untitled event"}
      </strong>
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

const useClock = () => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

export const CalendarAlarmBell = () => (
  <div
    className="sireno-calendar-alarm-bell"
    style={{ ...centered, color: accent }}
  >
    <style>{`@keyframes sireno-calendar-ring { 0%, 100% { transform: rotate(0deg) } 20% { transform: rotate(15deg) } 40% { transform: rotate(-15deg) } 60% { transform: rotate(10deg) } 80% { transform: rotate(-10deg) } } @keyframes sireno-calendar-alarm-flash { 0%, 49.99% { background: transparent; color: var(--sireno-color-primary, #62d5d0); } 50%, 100% { background: var(--sireno-color-accent, #62d5d0); color: var(--sireno-color-foreground-contrast, #111); } } @media (prefers-reduced-motion: no-preference) { .sireno-calendar-ringing { animation: sireno-calendar-ring 1.2s ease-in-out infinite; transform-origin: 50% 10%; } .sireno-calendar-alarm-bell { animation: sireno-calendar-alarm-flash 1s steps(1, end) infinite; } }`}</style>
    <span
      className="sireno-calendar-ringing"
      style={{ fontSize: "2.5em", lineHeight: 1 }}
    >
      <CalendarIcon bell />
    </span>
  </div>
)

export const CalendarAlarmCountdown = () => {
  const now = useClock()
  const data =
    globalThis.__calendarUseAddonChannel?.<CalendarSnapshot>(
      "calendar:state",
    ).data
  const start = data?.alarm?.startMs
  if (start === undefined) return <div style={centered}>—</div>
  const minutes = Math.ceil(Math.abs(start - now) / 60_000)
  const amount =
    minutes >= 1440
      ? `${Math.ceil(minutes / 1440)}d`
      : minutes >= 60
        ? `${Math.ceil(minutes / 60)}h`
        : `${minutes}m`
  return (
    <div style={centered}>
      <span>{start >= now ? "IN" : "AGO"}</span>
      <strong style={{ color: accent, fontSize: "1.4em" }}>{amount}</strong>
    </div>
  )
}

export const CalendarAlarmClock = () => {
  const data =
    globalThis.__calendarUseAddonChannel?.<CalendarSnapshot>(
      "calendar:state",
    ).data
  if (data?.alarm?.startMs === undefined) return <div style={centered}>—</div>
  const now = new Date(data.alarm.startMs)
  return (
    <div style={centered}>
      <span style={{ fontSize: "0.9em", color: accent }}>
        {new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" })
          .format(now)
          .toUpperCase()}
      </span>
      <strong style={{ fontSize: "1.3em" }}>
        {new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now)}
      </strong>
    </div>
  )
}

export const splitAlarmTitle = (title: string, parts: number): string[] => {
  const words = title.trim().split(/\s+/).filter(Boolean)
  const result = Array.from({ length: parts }, () => "")
  let position = 0
  for (let index = 0; index < words.length; index++) {
    const word = words[index]!
    const target =
      [result[position], ...words.slice(index)].filter(Boolean).join(" ")
        .length /
      (parts - position)
    const currentLength = result[position]!.length
    if (
      position < parts - 1 &&
      currentLength > 0 &&
      Math.abs(currentLength - target) <=
        Math.abs(currentLength + 1 + word.length - target)
    )
      position++
    result[position] = result[position] ? `${result[position]} ${word}` : word
  }
  return result
}

export const CalendarAlarmTitle = ({
  config,
}: {
  config: { part?: number; parts?: number }
}) => {
  const data =
    globalThis.__calendarUseAddonChannel?.<CalendarSnapshot>(
      "calendar:state",
    ).data
  return (
    <div style={centered}>
      <strong
        style={{
          ...lines,
          WebkitLineClamp: 3,
          maxWidth: "95%",
          fontSize: "0.85em",
          textWrap: "balance",
        }}
      >
        {
          splitAlarmTitle(
            data?.alarm?.title ?? "Calendar reminder",
            config.parts ?? 1,
          )[config.part ?? 0]
        }
      </strong>
    </div>
  )
}

export const CalendarAlarmArrow = () => (
  <div style={{ ...centered, color: accent }}>
    <svg
      aria-hidden="true"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  </div>
)
export const CalendarAlarmCompactInfo = () => (
  <div style={{ ...centered, flexDirection: "row", fontSize: "0.7em" }}>
    <CalendarAlarmCountdown />
    <CalendarAlarmClock />
  </div>
)

export const CalendarAlarmDismiss = () => (
  <IconLabelSurface source="icon://x" label="Dismiss" />
)
export const CalendarAlarmSnooze = () => (
  <IconLabelSurface source="icon://bell" label="Snooze" />
)

export const CalendarNavigationButton = ({
  config,
}: {
  config: { label?: string; day?: string }
}) => {
  if (config.day) {
    const date = new Date(`${config.day}T12:00:00`)
    return (
      <div style={centered}>
        <span
          style={{
            color: contrast,
            background: accent,
            borderRadius: "0.35em",
            padding: "0.1em 0.4em",
            fontSize: "0.8em",
          }}
        >
          {new Intl.DateTimeFormat(undefined, { month: "short" })
            .format(date)
            .toUpperCase()}
        </span>
        <strong style={{ fontSize: "2em", lineHeight: 1 }}>
          {date.getDate()}
        </strong>
        <span>
          {new Intl.DateTimeFormat(undefined, { weekday: "short" })
            .format(date)
            .toUpperCase()}
        </span>
      </div>
    )
  }
  return (
    <div style={centered}>
      <span style={{ fontSize: "2em", lineHeight: 1 }}>
        <CalendarIcon />
      </span>
      <strong>{config.label}</strong>
    </div>
  )
}
