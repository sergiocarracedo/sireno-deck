import { describe, expect, it } from "vitest"
import {
  agendaDateLabel,
  agendaEventTimeLabel,
  agendaSummary,
  eventHeading,
} from "../presentation.js"
import type { CalendarSnapshot } from "../runtime.js"
import { splitAlarmTitle } from "../frontend.js"

const event = (start: string): CalendarSnapshot["events"][number] => ({
  title: "Meeting",
  day: start.slice(0, 10),
  calendar: "work",
  color: undefined,
  hasLink: false,
  location: undefined,
  time: { kind: "timed", start, end: start },
})

describe("calendar presentation", () => {
  it("splits event titles across slots without losing or duplicating words", () => {
    const title = "Plan the plan for the week"
    const parts = splitAlarmTitle(title, 3)
    expect(parts).toHaveLength(3)
    expect(parts.every(Boolean)).toBe(true)
    expect(parts.filter(Boolean).join(" ")).toBe(title)
  })
  it("balances ordinary titles and preserves long words and overflow", () => {
    expect(splitAlarmTitle("Planning meeting with design team", 3)).toEqual([
      "Planning",
      "meeting with",
      "design team",
    ])
    const title =
      "A extraordinarilylongunbrokenword followed by many more words"
    expect(splitAlarmTitle(title, 3).filter(Boolean).join(" ")).toBe(title)
  })
  it("counts today's events and finds the next future event", () => {
    const now = new Date(2026, 10, 7, 10, 0)
    const earlier = event("2026-11-07T09:00:00")
    const later = event("2026-11-07T11:00:00")
    expect(agendaSummary([earlier, later], now)).toEqual({
      next: later,
      today: 2,
    })
    expect(eventHeading(later, now)).toBe("TODAY 11:00")
    expect(agendaEventTimeLabel(later, now)).toBe("11:00")
    expect(agendaEventTimeLabel(event("2026-11-08T09:30:00"), now)).toBe(
      "08/11 09:30",
    )
    expect(agendaDateLabel(later, now)).toBe("TODAY")
    expect(agendaDateLabel(event("2026-11-08T09:30:00"), now)).toBe("SUN")
    expect(agendaDateLabel(event("2026-11-09T09:30:00"), now)).toBe("09/11")
  })
  it("switches to month labels beyond two months", () => {
    const now = new Date(2026, 10, 7, 10, 0)
    expect(eventHeading(event("2026-11-11T12:00:00"), now)).toMatch(/11 12:00$/)
    expect(eventHeading(event("2027-02-12T12:00:00"), now)).toMatch(
      /^12 .* 12:00$/,
    )
  })
})
