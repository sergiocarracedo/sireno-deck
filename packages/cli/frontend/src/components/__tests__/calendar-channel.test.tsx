/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { ChannelRegistry } from "@/api/react/registry"
import { CalendarButton } from "../../../../../addons/calendar/src/frontend"
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
            time: { kind: "all-day", startDate: "2026-11-05" },
          },
        ],
      })
    })
    expect(screen.getByText("Team meeting")).toBeTruthy()
  } finally {
    host.__pomodoroUseAddonChannel = pomodoroHook
  }
})
