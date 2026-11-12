/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LoadingSurface } from "../LoadingSurface"

describe("LoadingSurface", () => {
  it("renders an accessible loading status with an hourglass and three dots", () => {
    const { container } = render(<LoadingSurface />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeTruthy()
    expect(container.querySelector("[data-sireno-ui-icon]")).toBeTruthy()
    expect(container.querySelectorAll(".sireno-loading-dot")).toHaveLength(3)
    expect(container.textContent).toContain("Loading...")
  })

  it("keeps dots visible when reduced motion is requested", () => {
    const { container } = render(<LoadingSurface />)
    expect(container.querySelector("style")?.textContent).toContain(
      "prefers-reduced-motion: no-preference",
    )
  })
})
