/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { ChannelRegistry } from "@/api/react/registry"
import {
  CalendarButton,
  CalendarEventButton,
} from "../../../../../addons/calendar/src/frontend"
import "../Deck"

afterEach(() => {
  cleanup()
  ChannelRegistry.resetForTests()
})

it("renders calendar channel updates using the host bridge independently of pomodoro", () => {
  const host = globalThis as { __pomodoroUseAddonChannel?: unknown }
  const pomodoroHook = host.__pomodoroUseAddonChannel
  host.__pomodoroUseAddonChannel = undefined
  try {
    render(<CalendarButton />)
    expect(screen.getByText(/Loading…/)).toBeTruthy()

    act(() => {
      ChannelRegistry.instance().publish("calendar:state", {
        page: 1,
        providers: [{ name: "Work", status: "ok" }],
        events: [
          {
            title: "Team meeting",
            day: "2099-11-05",
            time: { kind: "all-day", startDate: "2099-11-05" },
          },
        ],
      })
    })
    expect(screen.getByText(/Team meeting/)).toBeTruthy()
  } finally {
    host.__pomodoroUseAddonChannel = pomodoroHook
  }
})

it("keeps the agenda summary visible while an alarm is active", () => {
  render(<CalendarButton />)
  act(() => {
    ChannelRegistry.instance().publish("calendar:state", {
      page: 0,
      providers: [],
      events: [
        {
          title: "Next event",
          day: "2099-11-05",
          time: { kind: "all-day", startDate: "2099-11-05" },
        },
      ],
      alarm: { title: "Alarm title", startMs: Date.now() },
    })
  })
  expect(screen.queryByText("AGENDA")).toBeNull()
  expect(screen.getByText("Next event")).toBeTruthy()
  expect(screen.queryByText("Alarm title")).toBeNull()
})

it("hides stale provider labels but still shows unavailable providers", () => {
  render(<CalendarButton />)
  act(() => {
    ChannelRegistry.instance().publish("calendar:state", {
      page: 0,
      events: [],
      providers: [{ name: "Tst", status: "stale" }],
    })
  })
  expect(screen.queryByText(/Tst: stale/)).toBeNull()
  act(() => {
    ChannelRegistry.instance().publish("calendar:state", {
      page: 0,
      events: [],
      providers: [{ name: "Tst", status: "unavailable" }],
    })
  })
  expect(screen.getByText(/Tst: unavailable/)).toBeTruthy()
})

it("uses event color on both the main and event buttons", () => {
  const { container } = render(
    <>
      <CalendarButton />
      <CalendarEventButton config={{ slot: 0 }} />
    </>,
  )
  act(() =>
    ChannelRegistry.instance().publish("calendar:state", {
      page: 0,
      providers: [],
      events: [
        {
          title: "Feverup",
          color: "#aa55cc",
          day: "2099-11-05",
          time: { kind: "all-day", startDate: "2099-11-05" },
        },
      ],
    }),
  )
  const colored = Array.from(
    container.querySelectorAll<HTMLElement>("span, strong"),
  ).filter((node) => node.style.color === "rgb(170, 85, 204)")
  expect(colored.length).toBeGreaterThanOrEqual(4)
  const date = colored.find(
    (node) => node.tagName === "SPAN" && node.style.borderRadius,
  )
  const time = colored
    .filter(
      (node) => node.tagName === "STRONG" && node.textContent === "ALL DAY",
    )
    .at(-1)
  expect(time?.style.fontSize).toBe(date?.style.fontSize)
  expect(
    container.querySelectorAll<HTMLElement>('[style*="border-radius"]').length,
  ).toBeGreaterThanOrEqual(2)
  expect(screen.getAllByText("Feverup")).toHaveLength(2)
})
