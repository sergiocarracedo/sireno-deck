/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { act, render } from "@testing-library/react"

import { IconLabelProgressSurface } from "../IconLabelProgressSurface"

describe("IconLabelProgressSurface", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("hides progress bar by default", () => {
    const { container } = render(
      <IconLabelProgressSurface
        source="🔥"
        label="Brightness"
        progress={50}
        visible={false}
      />,
    )
    const root = container.querySelector(
      "[data-sireno-surface='icon-label-progress']",
    )
    expect(root).not.toBeNull()
    expect(root?.getAttribute("data-visible")).toBe("false")
    expect(root?.getAttribute("data-progress")).toBe("50")
  })

  it("shows progress bar when visible and auto-hides after visibleMs", () => {
    const { container } = render(
      <IconLabelProgressSurface
        source="🔥"
        label="Brightness"
        progress={75}
        visible
        visibleMs={1000}
      />,
    )
    const root = container.querySelector(
      "[data-sireno-surface='icon-label-progress']",
    )
    expect(root?.getAttribute("data-visible")).toBe("true")

    act(() => {
      vi.advanceTimersByTime(1100)
    })

    expect(root?.getAttribute("data-visible")).toBe("false")
  })

  it("resets hide timer when visible flips to true while already visible", () => {
    const onHide = vi.fn()
    const { rerender } = render(
      <IconLabelProgressSurface
        source="🔥"
        label="Brightness"
        progress={50}
        visible
        visibleMs={1000}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(800)
    })

    rerender(
      <IconLabelProgressSurface
        source="🔥"
        label="Brightness"
        progress={60}
        visible
        visibleMs={1000}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(800)
    })

    // Total elapsed: 1600ms; but timer was reset at 800ms, so still visible.
    const root = document.querySelector(
      "[data-sireno-surface='icon-label-progress']",
    )
    expect(root?.getAttribute("data-visible")).toBe("true")

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(root?.getAttribute("data-visible")).toBe("false")
    expect(onHide).not.toHaveBeenCalled()
  })
})
