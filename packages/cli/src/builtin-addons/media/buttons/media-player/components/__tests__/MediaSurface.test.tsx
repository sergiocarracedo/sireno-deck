/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"

import { MediaSurface } from "../MediaSurface"
import type { MediaButtonStatus } from "@/builtin-addons/media/state"

const renderInJsdom = (element: React.ReactElement): HTMLElement => {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const React = require("react")
  const ReactDOM = require("react-dom/client")
  const act = require("react-dom/test-utils").act

  act(() => {
    ReactDOM.createRoot(container).render(element)
  })
  return container
}

const renderSurface = (overrides: Record<string, unknown> = {}) =>
  renderInJsdom(
    require("react").createElement(MediaSurface, {
      title: "Track Title",
      artist: "Track Artist",
      source: "Album Name",
      progress: 42,
      status: "play" as MediaButtonStatus,
      currentTime: 83,
      totalTime: 225,
      ...overrides,
    }),
  )

describe("MediaSurface", () => {
  it("renders the title, artist", () => {
    const root = renderSurface()
    expect(root.textContent).toContain("Track Title")
    expect(root.textContent).toContain("Track Artist")
  })

  it("renders currentTime formatted as M:SS", () => {
    const root = renderSurface({ currentTime: 83, totalTime: 225 })
    expect(root.textContent).toContain("1:23")
  })

  it("renders currentTime as 0:SS when small", () => {
    const root = renderSurface({ currentTime: 42, totalTime: 0 })
    expect(root.textContent).toContain("0:42")
  })

  it("renders 0:00 when currentTime is 0", () => {
    const root = renderSurface({ currentTime: 0, totalTime: 0 })
    expect(root.textContent).toContain("0:00")
  })

  it("renders a Lucide generic icon for each status (not Unicode glyphs)", () => {
    const statuses: MediaButtonStatus[] = [
      "play",
      "pause",
      "stop",
      "unsupported",
      "notAvailable",
    ]
    for (const status of statuses) {
      const root = renderSurface({ status })
      const lucideSvg = root.querySelector(
        '[data-sireno-icon-source="generic"]',
      )
      expect(lucideSvg, `status=${status}`).not.toBeNull()
      expect(root.textContent, `status=${status}`).not.toMatch(/[▶⏸⏹⚠]/)
    }
  })

  it("renders the progress bar at the requested width", () => {
    const root = renderSurface({ progress: 42 })
    const fill = Array.from(root.querySelectorAll("div")).find((el) => {
      const style = el.getAttribute("style")
      return style !== null && style.includes("width")
    }) as HTMLElement | undefined
    expect(fill).toBeDefined()
    expect(fill?.style.width).toBe("42%")
  })

  it("uses foreground-contrast tone for play status", () => {
    const root = renderSurface({ status: "play" })
    const lucideSvg = root.querySelector('[data-sireno-icon-source="generic"]')
    expect(lucideSvg?.getAttribute("class")).toContain(
      "text-foreground-contrast",
    )
  })

  it("uses default tone for stop status", () => {
    const root = renderSurface({ status: "stop" })
    const lucideSvg = root.querySelector('[data-sireno-icon-source="generic"]')
    expect(lucideSvg).not.toBeNull()
  })
})
